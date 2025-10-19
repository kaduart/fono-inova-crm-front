import { Hospital } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

export const Header = () => {
    const navigate = useNavigate();
    const handleButtonClick = (route) => {
        navigate(route);
    };
    
    return (
        <header className="bg-white text-green-700 px-6 py-4 shadow-md flex items-center justify-between border-b border-green-100">
            <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                    <Hospital className="h-6 w-6 text-green-600" />
                </div>
                <NavLink 
                    to="/admin" 
                    className={({ isActive }) =>
                        `text-2xl font-extrabold leading-tight tracking-tight ${isActive ? 'text-green-900' : 'text-green-700'}`
                    }
                >
                    Clínica Fono <span className="text-green-500">Inova</span>
                </NavLink>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    className='text-green-700 border border-green-200 bg-white hover:bg-green-50 px-4 py-2 shadow-sm flex items-center justify-between transition-colors'
                    onClick={() => handleButtonClick('/login')}
                >
                    Login
                </Button>
                <Button 
                    className='bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 px-4 py-2 shadow-md flex items-center justify-between transition-all'
                    onClick={() => handleButtonClick('/signup')}
                >
                    Cadastre-se
                </Button>
            </div>
        </header>
    );
};