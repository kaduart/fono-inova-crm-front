import { TherapeuticPlan } from '../../services/liminarContractService';

const DAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

const SPECIALTY_LABELS: Record<string, string> = {
  fonoaudiologia: 'Fonoaudiologia',
  terapia_ocupacional: 'Terapia Ocupacional',
  psicologia: 'Psicologia',
  fisioterapia: 'Fisioterapia',
  psicomotricidade: 'Psicomotricidade',
  musicoterapia: 'Musicoterapia',
  psicopedagogia: 'Psicopedagogia',
  neuropediatria: 'Neuropediatria',
};

interface Props {
  plan: TherapeuticPlan;
}

export default function PlanView({ plan }: Props) {
  const entries = Object.entries(plan.therapies ?? {});

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 italic">Nenhuma especialidade configurada.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([specialty, config]) => (
        <div key={specialty} className="bg-white rounded-lg border border-green-100 px-4 py-3">
          <p className="text-sm font-semibold text-green-800 mb-1.5">
            {SPECIALTY_LABELS[specialty] ?? specialty}
            <span className="ml-2 text-xs font-normal text-gray-500">
              R$ {Number(config.sessionValue).toFixed(2)}/sessão
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(config.slots ?? []).map((slot, i) => (
              <span
                key={i}
                className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full"
              >
                {DAY_LABELS[slot.dayOfWeek]} {slot.time}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
