import { Pencil, Trash2 } from "lucide-react";
import { Appointment } from "../hooks/useTempAppointments";

type Props = {
  appointments: Appointment[];
  onEdit: (appt: Appointment) => void;
  onDelete: (id: string) => void;
};

export const TempAppointmentsTable = ({ appointments, onEdit, onDelete }: Props) => {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Agendamentos Temporários</h3>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Profissional</th>
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Tipo de Sessão</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{appt.profissional}</td>
                <td className="px-4 py-2">
                  {new Date(appt.dataHora).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-2">{appt.tipoSessao}</td>
                <td className="px-4 py-2">{appt.status}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => onEdit(appt)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(appt.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
