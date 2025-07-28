import { User } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { IDoctors, IPatient, ISession, ITherapyPackage } from '../../utils/types/types';
import { SessionListItem } from './SessionListItem';
import { SessionModal } from './SessionModal';

type Props = {
  pack?: ITherapyPackage;
  patient: IPatient;
  doctors: IDoctors[];
  onUseSession: (id: string, session: ISession, modalAction: string) => void;
  onCardClick?: (pack: ITherapyPackage) => void;
};
type ModalAction = 'edit' | 'use' | null;

export default function TherapyPackageCard({
  pack,
  patient,
  doctors,
  onUseSession,
  onCardClick = () => { },
}: Props) {

  if (!pack) return null;

  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [isUseSessionModalOpen, setIsUseSessionModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ISession>({
    _id: '',
    date: '',
    doctorId: '',
    package: '',
    sessionType: 'fonoaudiologia',
    status: 'pending',
    paymentAmount: 0,
    paymentMethod: 'dinheiro',
    notes: '',
    isPaid: true,
    confirmedAbsence: false
  });
  const [loading, setLoading] = useState(false);
  const openModalWithAction = (action: 'edit' | 'use', session?: ISession) => {
    setModalAction(action);
    setSelectedSession(session || null);
    setIsModalOpen(true);
  };

  const handleSessionSubmit = async () => {
    const payload = {
      ...selectedSession,
      package: pack._id, // Garante envio do packageId
      sessionType: pack.sessionType, // Herda do pacote
    };

    setLoading(true);

    try {

      await onUseSession(pack._id, payload, modalAction);

      // Fechar modal e resetar dados
      setIsUseSessionModalOpen(false);

      setIsModalOpen(false);

    } catch (err) {
      console.error("Erro:", err);
      toast.error("Erro ao salvar sessão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 transition-all duration-300">
      <div
        onClick={() => onCardClick(pack)}
        className="cursor-pointer bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
      >
        {/* Cabeçalho com novo estilo de status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="font-semibold text-gray-800">{patient.fullName}</span>
          </div>
          <div className={`px-3 py-1 text-xs font-medium rounded-full ${pack.status === 'active' ? 'bg-green-100 text-green-800' :
            pack.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
            {{
              active: 'Ativo',
              pending: 'Pendente',
              completed: 'Completo',
            }[pack.status]?.toUpperCase()}
          </div>
        </div>

        {/* Título e métricas principais */}
        <h3 className="text-2xl font-semibold text-gray-800 mb-4 capitalize">
          {pack.sessionType?.toLowerCase()}
        </h3>

        {/* Grid de métricas melhorado */}
        <div className="w-full space-y-1">
          <div className="text-gray-500">Progresso</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full bg-[length:20px_20px] animate-dash"
                style={{
                  width: `${(pack.sessionsDone / pack.totalSessions) * 100}%`,
                  backgroundImage: `
                                        linear-gradient(
                                          45deg,
                                          rgba(255,255,255,0.4) 25%,
                                          transparent 25%,
                                          transparent 50%,
                                          rgba(255,255,255,0.4) 50%,
                                          rgba(255,255,255,0.4) 75%,
                                          transparent 75%,
                                          transparent
                                        )
                                     `
                }}
              ></div>
            </div>
            <span className="font-medium">{pack.sessionsDone}/{pack.totalSessions}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 mt-5 gap-4 text-sm text-gray-700 mb-6">

          <div className="flex flex-col  justify-center">
            <span className="text-gray-500">Valor Total:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.totalValue)}
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-gray-500">Saldo Restante:</span>
            <span className={`font-medium ${pack.balance > 0 ? 'text-red-500' : 'text-green-500'
              }`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(pack.balance)}
            </span>
          </div>


          {
            pack.balance < 0 && (
              <div className="bg-red-100 text-red-800 p-2 rounded-md mt-2">
                Crédito: {Math.abs(pack.balance)} (verificar necessidade de reembolso)
              </div>
            )
          }

          {
            pack.remaining < 0 && (
              <div className="bg-yellow-100 text-yellow-800 p-2 rounded-md mt-2">
                Sessões extras realizadas: {Math.abs(pack.remaining)}
              </div>
            )
          }

          {
            pack?.payments?.length === 0 && (
              <div className="bg-orange-100 text-orange-800 p-2 rounded-md mt-2">
                Nenhum pagamento registrado
              </div>
            )
          }

        </div>

        {/* Tabela de detalhes financeiros com novo estilo */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <dt className="text-gray-500">Valor por Sessão</dt>
              <dd className="font-medium">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(pack.sessionValue)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-gray-500">Total Pago</dt>
              <dd className="font-medium text-green-500">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(pack.totalPaid)}
              </dd>
            </div>
          </dl>
        </div>
      </div>


      <details className="mt-4">
        <summary className="cursor-pointer text-blue-600 hover:underline font-medium">
          Ver sessões ({pack?.sessions?.length})
        </summary>

        <ul className="mt-2 space-y-2">
          {pack.sessions && pack.sessions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((session, sessionNumber) => (
              <SessionListItem
                key={session._id}
                session={session}
                sessionNumber={sessionNumber + 1}
                onEdit={() => openModalWithAction('edit', session)}
                onUse={() => openModalWithAction('use', session)}
              />
            ))}
        </ul>
      </details>


      {
        isModalOpen && (
          <SessionModal
            action={modalAction}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedSession(null);
            }}
            doctors={doctors}
            onSessionDataChange={(data) => setSelectedSession(data)}
            onSubmit={handleSessionSubmit}
            loading={loading}
            sessionData={selectedSession || {
              _id: '',
              date: '',
              doctorId: '',
              package: '',
              sessionType: 'fonoaudiologia',
              status: 'pending',
              paymentAmount: 0,
              paymentMethod: 'dinheiro',
              notes: '',
              isPaid: false
            }}
          />
        )
      }
    </div >
  );
}