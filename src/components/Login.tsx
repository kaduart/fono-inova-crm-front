import { Box } from '@mui/material';
import { Eye, EyeOff, Shield, Stethoscope, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BASE_URL } from '../constants/constants';
import { useAuth } from '../contexts/AuthContext';
import { useAuthNavigation } from '../hooks/useAuthNavigation';
import { LoadingSpinner } from './ui/LoadingSpinner';

const Login = () => {
  const { login } = useAuthNavigation();
  const navigate = useNavigate();
  const auth = useAuth();

  // Acesso seguro ao loading
  const loading = auth?.loading || {
    isLoading: false,
    showLoading: () => { },
    hideLoading: () => { }
  };


  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const roles = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'paciente', label: 'Paciente', icon: User },
    { id: 'doctor', label: 'Profissional', icon: Stethoscope },
  ];

  const [currentImage, setCurrentImage] = useState(0);
  const images = [
    'AppointmentPhoto.png',
    'DoctorsPhoto.png',
    'NursePhoto.png',
    'HeartPulsePhoto.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const errorCode = searchParams.get('error');

    if (errorCode === 'TOKEN_EXPIRED') {
      toast.error('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loading.showLoading();
    setError(null);

    try {
      const result = await login({ email, password, role: selectedRole });

      if (result.requiresPasswordCreation) {
        setShowCreatePassword(true);
      }
    } finally {
      loading.hideLoading();
    }
  };


  const handleCreatePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    loading.showLoading();

    try {
      const response = await fetch(`${BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newPassword,
          role: selectedRole
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar senha');
      }

      toast.success('Senha criada com sucesso!');
      setShowCreatePassword(false);

    } catch (error) {
      toast.error(error.message);
    } finally {
      loading.hideLoading();
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error('Por favor, informe seu email');
      return;
    }

    loading.showLoading();

    try {
      const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          role: selectedRole // Envia o role selecionado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao solicitar recuperação');
      }

      toast.success('Instruções enviadas para seu email!');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      loading.hideLoading();
    }
  };

  return loading.showLoading() ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
      <LoadingSpinner />
    </Box>
  ) : (
    <div className='min-h-screen flex flex-row'>
      <div className="w-1/2 bg-white flex justify-center items-center relative h-screen overflow-hidden">
        <div className="flex flex-col justify-center items-center gap-5">
          <div className="relative h-[50vh] w-[50vh]">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt="Slider"
                className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${currentImage === index ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
          </div>
          <h1 className="text-blue-600 text-3xl font-semibold text-center">Acesso inteligente aos cuidados de saúde</h1>
        </div>
      </div>

      <div className="w-1/2 bg-blue-600 flex items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h2 className="text-2xl font-bold text-center">
              {showForgotPassword ? 'Recuperar Senha' :
                showCreatePassword ? 'Criar Nova Senha' : 'Faça login no Portal de Saúde'}
            </h2>
            <p className="text-center text-blue-100 mt-1">
              {showForgotPassword ? 'Receba instruções por email' :
                showCreatePassword ? 'Defina sua senha de acesso' : 'Acesse sua conta'}
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white">
            <div className="p-6">
              {showForgotPassword ? (
                <>
                  <div className="flex bg-blue-100 rounded-lg p-1 mb-4">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${selectedRole === role.id ? 'bg-blue-600 text-white' : 'text-blue-600'}`}
                      >
                        <role.icon size={16} />
                        <span>{role.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="resetEmail" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                        Email Cadastrado
                      </label>
                      <input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Insira o email da sua conta"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-800">
                        Solicitando redefinição para: <strong className="font-semibold">
                          {roles.find(r => r.id === selectedRole)?.label}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Enviar Instruções
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                      }}
                      className="w-full text-blue-600 mt-2 text-sm hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </form>
                </>
              ) : showCreatePassword ? (
                <form onSubmit={handleCreatePassword} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Seu email cadastrado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Crie uma senha segura"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                      Confirmar Senha
                    </label>
                    <input
                      id="confirmPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Criar Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex bg-blue-100 rounded-lg p-1 mb-6">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${selectedRole === role.id ? 'bg-blue-600 text-white' : 'text-blue-600'}`}
                      >
                        <role.icon size={16} />
                        <span>{role.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Insira o email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-1 text-left">
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Insira a senha"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
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
                      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Login como {roles.find((r) => r.id === selectedRole)?.label}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetEmail(email); // Preenche com o email já digitado
                      }}
                      className="w-full text-blue-600 mt-2 text-sm hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 text-center">
              {!showForgotPassword && !showCreatePassword && (
                <p className="text-sm text-gray-600">
                  Não tem conta?{' '}
                  <button onClick={() => navigate('/signup')} className="text-blue-600 font-semibold hover:underline">
                    Cadastre-se
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;