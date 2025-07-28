import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SpecialtySelector from '../../components/common/SpecialtySelector';
import API from '../../services/api';
import { Specialty } from '../../utils/types';

const CreateAppointmentPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        patientId: '',
        date: '',
        time: '',
        duration: 30,
        specialty: '',
        reason: ''
    });

    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [specialtiesRes, patientsRes] = await Promise.all([
                    API.get<Specialty[]>('/specialties'),
                    API.get<any[]>('/patients')
                ]);

                setSpecialties(specialtiesRes.data);
                setPatients(patientsRes.data);
                setLoading(false);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast.error('Erro ao carregar dados necessários');
            }
        };

        fetchData();
    }, []);

    const handleSpecialtyChange = (specialtyId: string) => {
        const selectedSpecialty = specialties.find(s => s.id === specialtyId);

        setFormData({
            ...formData,
            specialty: specialtyId,
            duration: selectedSpecialty?.sessionDuration || 30
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Combinar data e hora
            const dateTime = new Date(`${formData.date}T${formData.time}`);

            const appointmentData = {
                ...formData,
                date: dateTime.toISOString()
            };

            await API.post('/appointments', appointmentData);
            toast.success('Agendamento criado com sucesso!');
            navigate('/schedule');
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            toast.error('Erro ao criar agendamento. Tente novamente.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
                    Novo Agendamento
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Paciente
                            </label>
                            <select
                                value={formData.patientId}
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selecione um paciente</option>
                                {patients.map(patient => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.fullName} ({patient.document})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Especialidade
                            </label>
                            <SpecialtySelector
                                value={formData.specialty}
                                onChange={handleSpecialtyChange}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Data
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Hora
                            </label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Duração (minutos)
                            </label>
                            <input
                                type="number"
                                value={formData.duration}
                                readOnly
                                className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            Motivo da Consulta
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                            required
                        ></textarea>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/schedule')}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Agendar Consulta
                        </button>
                    </div>
                </form>
            </div>
            <Toaster position="top-center" />
        </div>
    );
};

export default CreateAppointmentPage;