import React from 'react';
import { Appointment } from '../../utils/types/index';
import NeuropedEvolutionForm from '../specialties/neuroped/NeuropedEvolutionForm';

interface DynamicEvolutionFormProps {
  appointment: Appointment;
}

const DynamicEvolutionForm: React.FC<DynamicEvolutionFormProps> = ({ appointment }) => {
  switch(appointment.specialty) {
    case 'neuroped':
      return <NeuropedEvolutionForm appointment={appointment} />;
    case 'fonoaudiologia':
      return <FonoEvolutionForm appointment={appointment} />;
    default:
      return (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-medium text-yellow-800">Formulário padrão de evolução</h3>
          <p className="text-yellow-700">Selecione uma especialidade para ver o formulário específico</p>
        </div>
      );
  }
};

export default DynamicEvolutionForm;