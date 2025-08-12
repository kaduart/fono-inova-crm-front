import { useEffect, useState } from 'react';
import SpecialtySelector from '../../components/common/SpecialtySelector';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import API from '../../services/api';

export default function ProfessionalProfilePage() {
    const [user, setUser] = useState(null);
    const [specialties, setSpecialties] = useState([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Buscar dados do usuário
                const userRes = await API.get('/users/me');
                //    const { user } = useUser();

                setUser(userRes.data);
                setSelectedSpecialties(userRes.data.specialties || []);

                // Buscar todas as especialidades disponíveis
                const specialtiesRes = await API.get('/specialties');
                setSpecialties(specialtiesRes.data);
            } catch (error) {
                console.error('Erro ao carregar perfil:', error);
            }
        };

        fetchData();
    }, []);

    const handleSpecialtyChange = (e) => {
        const specialtyId = e.target.value;
        if (e.target.checked) {
            setSelectedSpecialties([...selectedSpecialties, specialtyId]);
        } else {
            setSelectedSpecialties(selectedSpecialties.filter(id => id !== specialtyId));
        }
    };

    const saveProfile = async () => {
        try {
            await API.patch('/users/me', { specialties: selectedSpecialties });
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
        }
    };

    if (!user) return <div><LoadingSpinner /></div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-6">
                    <div>
                        <h2>Minhas Especialidades</h2>
                        <SpecialtySelector
                            value={user.specialty}
                            onChange={handleSpecialtyChange}
                        //   multiSelect={true}
                        />
                    </div>
                    <h2 className="text-xl font-semibold mb-3">Especialidades</h2>
                    <p className="text-gray-600 mb-4">Selecione as especialidades que você atende:</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {specialties.map(specialty => (
                            <div key={specialty.id} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`specialty-${specialty.id}`}
                                    checked={selectedSpecialties.includes(specialty.id)}
                                    onChange={handleSpecialtyChange}
                                    value={specialty.id}
                                    className="mr-2 h-5 w-5 text-blue-600 rounded"
                                />
                                <label htmlFor={`specialty-${specialty.id}`} className="flex items-center">
                                    <span
                                        className="mr-2 text-lg"
                                        style={{ color: specialty.color }}
                                    >
                                        {specialty.icon}
                                    </span>
                                    {specialty.name}
                                </label>
                            </div>
                        ))}
                    </div> *
                </div>

                <button
                    onClick={saveProfile}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
}