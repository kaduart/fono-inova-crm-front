import { Calendar, ChartBar, Clipboard, Clock, Cog, DollarSign, Globe, HeartPulse, Hospital, Shield, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { HeroInstrumentPanel } from './HeroInstrumentPanel';

const Button = ({ children, primary, onClick, ...props }) => (
  <button
    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${primary
      ? 'text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500'
      : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-green-500 border border-gray-300'
      }`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ icon: Icon, title, description, primary }) => (
  <div className={`rounded-lg shadow-sm p-2.5 transition-all duration-300 hover:shadow-md ${primary ? 'bg-white' : 'bg-gray-50'}`}>
    <Icon className="w-5 h-5 text-green-600 mb-1" />
    <h3 className="text-sm font-semibold mb-0.5 text-gray-800">{title}</h3>
    <p className="text-xs text-gray-600 leading-tight">{description}</p>
  </div>
);

const Section = ({ children, bg, height }) => (
  <section className={`${height || 'py-20'} ${bg} content-center`}>
    <div className="container mx-auto px-4 h-full">
      {children}
    </div>
  </section>
);

const Home = () => {
  const navigate = useNavigate();

  const handleButtonClick = (route) => {
    navigate(route);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <Section bg="bg-gradient-to-r from-green-600 to-emerald-700" height="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2 text-left">
                Simplifique a gestão da sua clínica
              </h1>
              <p className="text-sm text-green-100 mb-4 text-left">
                Sistema completo para otimizar atendimento, agilizar operações e melhorar a eficiência.
              </p>
              <div className="flex gap-2 justify-left">
                <Button primary onClick={() => handleButtonClick('/login')}>Explorar</Button>
                <Button onClick={() => handleButtonClick('/login')}>Agenda</Button>
              </div>
            </div>
            <HeroInstrumentPanel />
          </div>
        </Section>

        <Section height="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { icon: User, title: "Gestão de Pacientes", description: "Gerencie com eficiência registros de pacientes, consultas e histórico médico." },
              { icon: Hospital, title: "Gestão de Profissionais", description: "Gerencie perfis de profissionais, agendas e atribuições de pacientes." },
              { icon: Calendar, title: "Agendamento de consultas", description: "Simplifique o agendamento e o gerenciamento de consultas para pacientes e profissionais." }
            ].map((card, index) => (
              <Card key={index} {...card} primary />
            ))}
          </div>
        </Section>

        <Section bg="bg-gray-50" height="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="bg-gray-200 w-full h-64 rounded-lg overflow-hidden hidden md:block">
              <img src="home-2.jpeg" alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3 text-left text-gray-800">Modernize as operações da sua clínica</h2>
              <p className="text-sm text-gray-600 mb-5 text-left">
                Otimize seus fluxos de trabalho, melhore a satisfação do paciente e gere melhores resultados.
              </p>
              <div className="flex gap-3 justify-left">
                <Button primary onClick={() => handleButtonClick('/login')}>Explorar</Button>
                <Button onClick={() => handleButtonClick('/login')}>Agenda</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section height="py-5">
          <h2 className="text-lg font-bold mb-3 text-center text-gray-800">
            Por que escolher nosso sistema?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { icon: Clipboard, title: "Eficiência Aprimorada", description: "Nosso sistema agiliza tarefas administrativas, reduz a papelada e melhora a eficiência geral do hospital." },
              { icon: Users, title: "Atendimento ao Paciente Aprimorado", description: "Com registros abrangentes dos pacientes e agendamento inteligente, nosso sistema ajuda você a oferecer um melhor atendimento." },
              { icon: DollarSign, title: "Redução de Custos", description: "Nosso sistema de gestão hospitalar otimiza operações e reduz os custos operacionais, gerando economia significativa." },
              { icon: HeartPulse, title: "Melhores Resultados para os Pacientes", description: "Ao agilizar processos e melhorar o atendimento, nosso sistema contribui para melhores resultados e maior satisfação dos pacientes." },
              { icon: Shield, title: "Gestão Segura de Dados", description: "Nosso sistema garante a segurança e confidencialidade de todos os dados dos pacientes, com criptografia robusta e controles de acesso." },
              { icon: Cog, title: "Soluções Personalizáveis", description: "Nosso sistema é altamente configurável, permitindo adaptá-lo às necessidades e fluxos de trabalho específicos do seu hospital." },
              { icon: Clock, title: "Recursos que Economizam Tempo", description: "Automatize tarefas rotineiras e otimize fluxos de trabalho para economizar tempo valioso dos profissionais de saúde." },
              { icon: ChartBar, title: "Análises Avançadas", description: "Obtenha insights sobre as operações hospitalares com ferramentas poderosas de relatórios e análises." },
              { icon: Globe, title: "Infraestrutura Escalável", description: "Nosso sistema cresce com sua organização, suportando múltiplas unidades e expansão da base de usuários." }
            ]
              .map((card, index) => (
                <Card key={index} {...card} />
              ))}
          </div>
        </Section>
      </main>

      <footer className="bg-gradient-to-r from-green-800 to-emerald-900 py-6 border-t border-green-700">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-green-100 text-sm">&copy; 2025 Clínica Fono Inova. Todos os direitos reservados.</p>

          <div className="flex space-x-4">
            <a href="#" className="text-green-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="text-green-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="text-green-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;