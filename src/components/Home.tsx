import { Calendar, ChartBar, Clipboard, Clock, Cog, DollarSign, Globe, HeartPulse, Hospital, Shield, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';

const Button = ({ children, primary, onClick, ...props }) => (
  <button
    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${primary
      ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
      }`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ icon: Icon, title, description, primary }) => (
  <div className={`rounded-lg shadow-md p-6 ${primary ? 'bg-white' : 'bg-gray-100'}`}>
    <Icon className="w-8 h-8 text-blue-600 mb-4" />
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{description}</p>
    {/* <Button primary onClick={() => handleButtonClick('/login')}>Explore</Button> */}
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
        <Section bg="bg-blue-600" height="min-h-[30rem]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
            <div>
              <h1 className="text-5xl font-bold text-white mb-6 text-left">
                Simplifique a gestão do sua clínica
              </h1>
              <p className="text-xl text-white mb-10 text-left">
                Nosso sistema abrangente de gestão clínica ajuda você a otimizar o atendimento ao paciente, agilizar as operações e melhorar a eficiência geral.
              </p>
              <div className="flex gap-4 justify-left">
                <Button primary onClick={() => handleButtonClick('/login')}>Explorar recursos</Button>
                <Button onClick={() => handleButtonClick('/login')}>Compromissos</Button>
              </div>
            </div>
            <div className="bg-gray-200 w-full h-full min-h-[20rem] rounded-lg overflow-hidden">
              <img src="home-1.jpeg" alt="" />
            </div>
          </div>
        </Section>

        <Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: User, title: "Gestão de Pacientes", description: "Gerencie com eficiência registros de pacientes, consultas e histórico médico." },
              { icon: Hospital, title: "Gestão de Profissionais", description: "Gerencie perfis de profissionais, agendas e atribuições de pacientes." },
              { icon: Calendar, title: "Agendamento de consultas", description: "Simplifique o agendamento e o gerenciamento de consultas para pacientes e profissionais." }
            ].map((card, index) => (
              <Card key={index} {...card} primary />
            ))}
          </div>
        </Section>

        <Section bg="bg-gray-100" height="min-h-[25rem]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-gray-200 w-full h-64 min-h-[18rem] rounded-lg overflow-hidden flex justify-center items-center">
              <img src="home-2.jpeg" alt="" className='w-full' />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4 text-left">Modernize as operações do sua clínica</h2>
              <p className="text-xl text-gray-600 mb-8 text-left">
                Nosso sistema de gestão clínica oferece recursos de ponta para otimizar seus fluxos de trabalho, melhorar
                a satisfação do paciente e gerar melhores resultados.
              </p>
              <div className="flex gap-4 justify-left">
                <Button primary onClick={() => handleButtonClick('/login')}>Explorar Recursos</Button>
                <Button onClick={() => handleButtonClick('/login')}>Compromissos</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <h2 className="text-3xl font-bold mb-12 text-center">
            Por que escolher nosso sistema de gestão clínica?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      <footer className="bg-blue-900 py-6 border-t border-blue-700">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-100 text-sm">&copy; 2025 Clínica Fono Inova. Todos os direitos reservados.</p>

          <div className="flex space-x-4">
            <a href="#" className="text-blue-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="text-blue-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="text-blue-300 hover:text-white transition-colors duration-200">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;