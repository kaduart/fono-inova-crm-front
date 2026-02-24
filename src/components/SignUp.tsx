import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BASE_URL } from '../constants/constants';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }));
    // Limpa o erro do campo quando o usuário começar a digitar
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Nome completo é obrigatório";
    if (!formData.email.trim()) newErrors.email = "Email é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email é inválido";
    if (!formData.password) newErrors.password = "Senha é obrigatória";
    else if (formData.password.length < 6) newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "As senhas não coincidem";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  interface SignUpResponse {
    error?: string;
    message?: string;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(BASE_URL + '/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: 'patient', // Role padrão para cadastro
        }),
      });

      const data: SignUpResponse = await response.json();

      if (response.ok) {
        toast.success('Conta criada com sucesso!');
        navigate('/login');
      } else {
        const errorMessage = data.error || data.message || 'Erro ao criar conta. Tente novamente.';
        setErrors({ submit: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className='min-h-screen flex flex-row'>
      {/* Lado Esquerdo - Slideshow de Imagens */}
      <div className="hidden md:flex w-1/2 bg-white justify-center items-center relative h-screen overflow-hidden">
        <div className="flex flex-col justify-center items-center gap-5">
          {/* Container do Slideshow */}
          <div className="relative h-[50vh] w-[50vh]">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt="Cuidados de Saúde"
                className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${currentImage === index ? 'opacity-100' : 'opacity-0'
                  }`}
              />
            ))}
          </div>

          {/* Slogan */}
          <h1 className="text-green-600 text-3xl font-semibold text-center">
            Acesso Inteligente aos Cuidados de Saúde
          </h1>
        </div>
      </div>

      {/* Lado Direito - Formulário de Cadastro */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-transparent text-white p-6">
            <h2 className="text-2xl font-bold text-center">Cadastre-se como Paciente</h2>
            <p className="text-center text-green-100 mt-1">
              Crie sua conta para acessar os serviços de saúde
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-white">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome Completo */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 text-left mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Digite seu nome completo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Senha */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-left mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-10"
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
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 text-left mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Digite a senha novamente"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Botão de Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${isLoading
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
                    }`}
                >
                  {isLoading ? 'Criando Conta...' : 'Criar Conta'}
                </button>
              </form>
            </div>

            {/* Rodapé do Formulário */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Já tem uma conta?{" "}
                <button
                  onClick={() => navigate('/login')}
                  className="text-green-600 font-semibold hover:underline"
                >
                  Fazer Login
                </button>
              </p>
              {errors.submit && (
                <div className="mt-2 flex justify-center">
                  <p className="text-red-500 text-xs text-center">{errors.submit}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;