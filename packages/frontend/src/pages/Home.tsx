import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Shield,
  Smartphone,
  PieChart,
  Zap,
  CheckCircle,
  ArrowRight,
  Target
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: <PieChart className="w-8 h-8" />,
      title: 'Categorização Inteligente',
      description: 'Suas transações são categorizadas automaticamente usando IA, facilitando o controle.'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Análise em Tempo Real',
      description: 'Acompanhe suas receitas e despesas com gráficos e relatórios atualizados.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: '100% Seguro',
      description: 'Seus dados são criptografados e protegidos com as melhores práticas de segurança.'
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Acesso em Qualquer Lugar',
      description: 'Acesse sua conta de qualquer dispositivo, desktop ou mobile.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Conexão com Bancos',
      description: 'Conecte suas contas bancárias e tenha tudo em um só lugar.'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Objetivos Financeiros',
      description: 'Defina metas e acompanhe seu progresso para alcançar seus sonhos.'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Crie sua conta',
      description: 'Cadastro rápido e gratuito em menos de 2 minutos.'
    },
    {
      number: '2',
      title: 'Conecte seus bancos',
      description: 'Integração segura com suas contas bancárias via Open Banking.'
    },
    {
      number: '3',
      title: 'Acompanhe suas finanças',
      description: 'Visualize relatórios, gráficos e tome decisões inteligentes.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Guru do Dindin" className="h-17 w-auto" />
              <span className="text-3xl font-bold text-primary-600">Guru do Dindin</span>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#recursos" className="text-gray-700 hover:text-primary-600 transition-colors">Recursos</a>
              <a href="#como-funciona" className="text-gray-700 hover:text-primary-600 transition-colors">Como Funciona</a>
              <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">Entrar</Link>
              <Link
                to="/register"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Começar Grátis
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link
                to="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Começar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 text-white relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Seu Guru das<br />
                <span className="text-yellow-300">Finanças Pessoais</span>
              </h1>
              <p className="text-xl sm:text-2xl mb-8 text-white/90">
                Controle total do seu dinheiro com categorização inteligente e análises em tempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl inline-flex items-center justify-center space-x-2"
                >
                  <span>Começar Gratuitamente</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all inline-flex items-center justify-center"
                >
                  Fazer Login
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-white/80">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Grátis para começar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>100% seguro</span>
                </div>
              </div>
            </div>

            {/* Right side - Visual/Illustration */}
            <div className="flex items-center justify-center mt-8 lg:mt-0">
              <div className="relative w-full max-w-md lg:max-w-none">
                <img
                  src="/marketing.png"
                  alt="Guru do Dindin Dashboard"
                  className="w-full h-auto rounded-2xl lg:rounded-3xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Recursos Poderosos para Suas Finanças
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para ter controle total do seu dinheiro em uma única plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 duration-300"
              >
                <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Em 3 passos simples você já está no controle das suas finanças.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-1 bg-gradient-to-r from-primary-300 to-primary-200 z-0"></div>
                )}

                <div className="relative z-10">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Pronto para Transformar suas Finanças?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Junte-se a milhares de pessoas que já estão no controle do seu dinheiro.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center space-x-3 bg-white text-primary-600 px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
          >
            <span>Começar Agora Gratuitamente</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-6 text-white/70">Sem cartão de crédito necessário • 100% grátis</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo and description */}
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/logobranco.png" alt="Guru do Dindin" className="h-10 w-auto" />
                <span className="text-xl font-bold text-white">Guru do Dindin</span>
              </div>
              <p className="text-gray-400 mb-4">
                Seu Guru das Finanças Pessoais. Controle inteligente do seu dinheiro.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-2">
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Começar</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><a href="mailto:contato@gurudodindin.com.br" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            <p>© 2025 Guru do Dindin. Todos os direitos reservados.</p>
            <p className="mt-2">CNPJ: 62.050.286/0001-77</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
