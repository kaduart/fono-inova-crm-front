import { Route, Routes, useParams } from 'react-router-dom';
import EvolutionPage from '../components/pages/evolution/[id]';

const SpecialtyRouter = () => {
    const { specialty } = useParams();

    return (
        <Routes>
            <Route
                path="evolution/:id"
                element={
                    specialty === 'neuroped' ?
                        <NeuropedEvolutionPage /> :
                        specialty === 'fonoaudiologia' ?
                            <FonoEvolutionPage /> :
                            <EvolutionPage />
                }
            />

            {/* Adicione outras rotas especializadas aqui */}
            <Route
                path="dashboard"
                element={<DashboardPage specialty={specialty} />}
            />

            <Route
                path="schedule"
                element={<SchedulePage specialty={specialty} />}
            />
        </Routes>
    );
};

export default SpecialtyRouter;