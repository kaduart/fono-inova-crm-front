/* import { IPatient} from '../AdminDashboard';
import { TherapyPackageData } from './types';

type Props = {
    pkg: TherapyPackageData;
    patient: IPatient;
    onEdit: (pkg: TherapyPackageData) => void;
    onDelete: (id: string) => void;
};

export default function TherapyPackageListItem({ pkg, patient, onEdit, onDelete }: Props) {
    const lastSession = pkg.sessions.length ? pkg.sessions[pkg.sessions.length - 1] : null;

    return (
        <li className="p-4 bg-white rounded shadow flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex-1">
                <p className="font-medium text-lg">{pkg.type}</p>
                <p className="text-sm text-gray-600">Paciente: <span className="font-semibold">{patient.name}</span></p>
                <p className="text-sm text-gray-600">
                    Sessões usadas: <span className="font-semibold">{pkg.sessionsDone}</span> de{' '}
                    <span className="font-semibold">{pkg.totalSessions}</span>
                </p>
                {lastSession ? (
                    <p className="text-sm text-gray-600">
                        Última sessão em <span className="font-semibold">{new Date(lastSession.date).toLocaleDateString()}</span>{' '}
                        com <span className="font-semibold">{lastSession.professional}</span> ({lastSession.sessionType})
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 italic">Nenhuma sessão ainda</p>
                )}
                <p className="text-sm text-gray-600">Pagamentos: <span className="font-semibold">{pkg.payments.length}</span></p>
            </div>

            <div className="flex gap-2 mt-4 sm:mt-0">
                <button onClick={() => onEdit(pkg)} className="text-blue-600 hover:underline">Editar</button>
                <button onClick={() => onDelete(pkg.id)} className="text-red-600 hover:underline">Excluir</button>
            </div>
        </li>
    );
}
 */