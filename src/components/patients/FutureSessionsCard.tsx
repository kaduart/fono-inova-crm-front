import { Calendar, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ISession } from '../../utils/types/types';
import { getFutureSessions } from '../../services/sessionService';

interface FutureSessionsCardProps {
  patientId: string;
}

export const FutureSessionsCard = ({ patientId }: FutureSessionsCardProps) => {
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getFutureSessions(patientId);
      setSessions(data);
    } catch (error) {
      toast.error('Erro ao carregar sessões futuras');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchSessions();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mt-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Sessões Futuras Pagas</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sessões adquiridas antecipadamente
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {sessions.map((session) => (
            <div 
              key={session._id} 
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">
                    Dr. {session.doctor?.fullName}
                  </h4>
                  <span className="flex items-center text-sm font-medium text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {session.time}
                  </span>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {new Date(session.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {session.sessionType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.specialty}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 text-center">
        <button 
          className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
          onClick={fetchSessions}
        >
          Atualizar lista
        </button>
      </div>
    </div>
  );
};