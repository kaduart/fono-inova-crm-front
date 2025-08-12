import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { Specialty, SpecialtySelectorProps } from '../../utils/types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const SpecialtySelector: React.FC<SpecialtySelectorProps> = ({
  value,
  onChange,
  showIcon = false
}) => {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await API.get<Specialty[]>('/specialties');
        setSpecialties(response.data);
      } catch (error) {
        console.error('Erro ao buscar especialidades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialties();
  }, []);

  if (loading) return <div className="p-2"><LoadingSpinner /></div>;
  return (
    <div className="w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded p-2 w-full"
      >
        <option value="">Selecione uma especialidade</option>
        {specialties.map(specialty => (
          <option key={specialty?.id} value={specialty?.id}>
            {specialty.name}
          </option>
        ))}
      </select>

      {showIcon && value && (
        <div className="mt-2 flex items-center">
          <span className="mr-2" style={{ color: specialties.find(s => s.id === value)?.color }}>
            {specialties.find(s => s.id === value)?.icon}
          </span>
          <span>{specialties.find(s => s.id === value)?.name}</span>
        </div>
      )}
    </div>
  );
};

export default SpecialtySelector;