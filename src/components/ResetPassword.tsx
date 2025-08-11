import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage('As senhas não coincidem');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/doctors/auth/reset-password/${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao redefinir senha');
            }

            setMessage('Senha redefinida com sucesso! Redirecionando...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Redefinir Senha</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        Nova Senha
                    </label>
                    <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                        minLength={6}
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirmar Nova Senha
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {isLoading ? 'Processando...' : 'Redefinir Senha'}
                </button>

                {message && (
                    <p className={`text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
};