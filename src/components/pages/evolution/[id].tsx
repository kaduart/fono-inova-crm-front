import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import API from '../../../services/api';
import DynamicEvolutionForm from '../../evolution/DynamicEvolutionForm';
import { Appointment } from '../../../hooks/useTempAppointments';

const EvolutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        if (!id) return;
        
        const response = await API.get<Appointment>(`/appointments/${id}`);
        setAppointment(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar agendamento:', error);
        setError('Não foi possível carregar os dados do agendamento');
        setLoading(false);
      }
    };
    
    fetchAppointment();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}. <button onClick={() => navigate(-1)} className="font-medium underline text-red-700 hover:text-red-600">Voltar</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Evolução do Paciente
          </h1>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            Voltar
          </button>
        </div>
        
        {appointment ? (
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Paciente</p>
                  <p className="font-medium">{appointment.patient?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data</p>
                  <p className="font-medium">
                    {new Date(appointment.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Especialidade</p>
                  <p className="font-medium">{appointment.specialty}</p>
                </div>
              </div>
            </div>
            
            <DynamicEvolutionForm appointment={appointment} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Agendamento não encontrado</p>
          </div>
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default EvolutionPage;