import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BASE_URL } from '../constants/constants';
import { LoadingSpinner } from './ui/LoadingSpinner';

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();

    // Extrai o role da URL
    const queryParams = new URLSearchParams(window.location.search);
    const role = queryParams.get('role');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState(null);

    // Verifica se o token é válido ao carregar
    useEffect(() => {
        const verifyToken = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/auth/verify-reset-token/${token}?role=${role}`);
                setIsTokenValid(response.data.valid);

                if (!response.data.valid) {
                    setMessage({
                        text: 'Link inválido ou expirado. Solicite um novo link.',
                        type: 'error'
                    });
                }
            } catch (error) {
                console.error('Erro ao verificar token:', error);
                setIsTokenValid(false);
                setMessage({
                    text: 'Erro ao verificar link. Tente novamente.',
                    type: 'error'
                });
            }
        };

        if (!role || !['doctor', 'admin'].includes(role)) {
            setMessage({
                text: 'Tipo de usuário não especificado ou inválido',
                type: 'error'
            });
            setIsTokenValid(false);
            return;
        }

        verifyToken();
    }, [token, role]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isTokenValid) {
            toast.error('Link inválido. Não é possível redefinir a senha.');
            return;
        }

        if (password.length < 6) {
            setMessage({ text: 'A senha deve ter no mínimo 6 caracteres', type: 'error' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ text: 'As senhas não coincidem', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.patch(
                `${BASE_URL}/auth/reset-password/${token}`,
                { password, role }
            );

            localStorage.setItem('token', response.data.token);

            toast.success('Senha redefinida com sucesso!');
            setMessage({
                text: 'Redirecionando para login...',
                type: 'success'
            });

            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.message ||
                'Erro ao redefinir senha';

            setMessage({
                text: errorMessage,
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isTokenValid === null) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner />
                <p className="ml-2">Verificando link...</p>
            </div>
        );
    }

    if (!isTokenValid) {
        return (
            <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Link Inválido</h2>
                <p className="mb-4">{message.text || 'Este link de redefinição é inválido ou expirou.'}</p>
                <button
                    onClick={() => navigate('/forgot-password')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                    Solicitar novo link
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Redefinir Senha</h2>
                <p className="text-gray-600 mt-1">Para {role === 'doctor' ? 'profissional' : 'administrador'}</p>
            </div>

            {message.text && (
                <div className={`mb-4 p-3 rounded-md ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Nova Senha
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua nova senha"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Nova Senha
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme sua nova senha"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <LoadingSpinner size="small" className="mr-2" />
                            Processando...
                        </span>
                    ) : (
                        'Redefinir Senha'
                    )}
                </button>
            </form>
        </div>
    );
}

export default ResetPassword;