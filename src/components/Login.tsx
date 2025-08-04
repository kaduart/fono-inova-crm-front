import { Box } from '@mui/material';
import { Eye, EyeOff, Shield, Stethoscope, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../constants/constants';
import { LoadingSpinner } from './ui/LoadingSpinner';

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

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

    return () => clearInterval(interval); // Cleanup
  }, []);

  // No seu componente de login
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const errorCode = searchParams.get('error');

    if (errorCode === 'TOKEN_EXPIRED') {
      alert('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    console.log('👉 Botão clicado - início da função');
    e.preventDefault();
    console.log('👉 Botão clicado - início da função 222');
    setIsLoading(true);
    console.log('👉 Submetendo: 33333', { email, role: selectedRole }); // Debug

    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: selectedRole
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Resposta inválida do servidor');
      }

      const data = await response.json();
      console.log('✅ Login success:', data); // Debug

      // Armazenamento único dos dados
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userEmail', email);
      setUser(data.user);

      // Redirecionamento
      switch (data.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'doctor':
          navigate('/dashboard');
          break;
        default:
          navigate('/patient');
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error('Erro ao conectar ao servidor:', error.message);
        toast.error(error.message || 'Erro ao conectar ao servidor');
      }

    } finally {
      setIsLoading(false);
    }
  };

  return isLoading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }} >
      <LoadingSpinner />
    </Box >
  ) : (
    <div className='min-h-screen flex flex-row'>
      <div className="w-1/2 bg-white flex justify-center items-center relative h-screen overflow-hidden">
        <div className="flex flex-col justify-center items-center gap-5">

          {/* Image Slider Container */}
          <div className="relative h-[50vh] w-[50vh]">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt="Slider"
                className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${currentImage === index ? 'opacity-100' : 'opacity-0'
                  }`}
              />
            ))}
          </div>

          {/* Tagline */}
          <h1 className="text-blue-600 text-3xl font-semibold text-center">Acesso inteligente aos cuidados de saúde</h1>
        </div>
      </div>

      <div className="w-1/2 bg-blue-600 flex items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h2 className="text-2xl font-bold text-center">Faça login no Portal de Saúde</h2>
            <p className="text-center text-blue-100 mt-1">Acesse sua conta</p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white">
            <div className="p-6">
              <div className="flex bg-blue-100 rounded-lg p-1 mb-6">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${selectedRole === role.id ? 'bg-blue-600 text-white' : 'text-blue-600'
                      }`}
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
                    Password
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
              </form>
            </div>
            <div className="bg-gray-50 px-6 py-4 text-center">
              <p className="text-sm text-gray-600">
                Não tem conta?{' '}
                <button onClick={() => navigate('/signup')} className="text-blue-600 font-semibold hover:underline">
                  Sair
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Login;