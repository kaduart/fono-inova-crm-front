import { Hospital } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

export const Header = () => {
    const navigate = useNavigate();
    const handleButtonClick = (route) => {
        navigate(route);
    };

    return (
        <header className="bg-white text-green-700 px-3 py-1.5 shadow-sm  sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo e nome */}
                <NavLink 
                    to="/admin" 
                    className="flex items-center gap-1.5 group"
                >
                    <div className="bg-green-100 p-1 rounded-full group-hover:bg-green-200 transition-colors">
                        <Hospital className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-base font-bold tracking-tight text-green-700">
                        Clínica Fono <span className="text-green-500">Inova</span>
                    </span>
                </NavLink>

                {/* Botões */}
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => handleButtonClick('/login')}
                        className="px-2.5 py-1 text-xs border border-green-300 text-green-700 bg-white hover:bg-green-50 hover:border-green-400 rounded-md transition-all"
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => handleButtonClick('/signup')}
                        className="px-2.5 py-1 text-xs bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 rounded-md transition-all"
                    >
                        Cadastre-se
                    </button>
                </div>
            </div>
        </header>
    );
};