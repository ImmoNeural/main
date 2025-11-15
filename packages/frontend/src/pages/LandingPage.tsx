import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Shield,
  Smartphone,
  PieChart,
  Zap,
  ArrowRight,
  Target,
  Star,
  Check,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubscribeClick = () => {
    if (isAuthenticated) {
      navigate('/app/planos');
    } else {
      navigate('/login');
    }
  };

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

  const testimonials = [
    {
      name: 'Rafael',
      text: 'Perfeição. É um portal extremamente completo com integração via Open Finance. É intuitivo, rápido, e o valor faz sentido pelo que entrega. Uso para minha empresa e tem me ajudado demais. Recomendo.'
    },
    {
      name: 'Carol Mendes',
      text: 'Portal sensacional! Uso a versão manual porque gosto de inserir meus dados, isso me dá mais consciência e controle. A visão geral em gráficos e porcentagens facilita muito minhas decisões financeiras.'
    },
    {
      name: 'Leonardo Freitas',
      text: 'Estou gostando bastante. É simples de usar, direto ao ponto e está me ajudando a colocar minha vida financeira em ordem.'
    },
    {
      name: 'Mariana Souza',
      text: 'Sem dúvidas o melhor que já testei. A organização desse portal é impecável, pensaram em cada detalhe realmente importante.'
    },
    {
      name: 'Diego Martins',
      text: 'Portal excelente: visual minimalista, super intuitivo e muito fácil de usar no dia a dia.'
    },
    {
      name: 'Júlia Ferreira',
      text: 'Estou usando há uns 4 ou 5 dias e já experimentei vários antes. Este é o melhor até agora. Muito prático e organizado, sem complicação.'
    }
  ];

  const plans = [
    {
      name: 'Plano Manual',
      description: 'Para quem gosta de acompanhar cada detalhe',
      originalPrice: 166.90,
      price: 133.90,
      discount: 20,
      monthlyPrice: 13.90,
      features: [
        'Sem Conexão Bancária',
        'Controle manual de contas e cartões',
        'Categorias e subcategorias',
        'Limite de gastos ilimitados',
        'Alerta de contas a pagar',
        'Relatórios completos'
      ],
      icon: <Shield className="w-12 h-12" />
    },
    {
      name: 'Plano Conectado',
      description: 'Ideal para quem quer agilidade',
      originalPrice: 358.80,
      price: 249.90,
      discount: 30,
      monthlyPrice: 29.90,
      popular: true,
      features: [
        'Tudo do Plano Manual',
        'Até 3 contas/cartões conectados',
        'Conexão via Open Finance',
        'Importe com 1 clique',
        'Categorize automaticamente',
        'Mais agilidade'
      ],
      icon: <Zap className="w-12 h-12" />
    },
    {
      name: 'Plano Conectado Plus',
      description: 'Para múltiplas contas bancárias',
      originalPrice: 502.90,
      price: 352.90,
      discount: 30,
      monthlyPrice: 41.90,
      features: [
        'Tudo do Plano Conectado',
        'Até 10 contas/cartões',
        'Multi-Empresas/Famílias',
        'Relatórios PDF/Excel',
        'Suporte Dedicado 24h'
      ],
      icon: <Crown className="w-12 h-12" />
    }
  ];

  const faqItems = [
    {
      question: 'Qual o desconto real ao optar pela assinatura Anual?',
      answer: 'Ao optar pelo pagamento anual à vista, você economiza significativamente. Dependendo do plano, o desconto chega a 30% em comparação com o pagamento mensal.'
    },
    {
      question: 'Quais são as formas de pagamento disponíveis?',
      answer: 'Você pode pagar com cartão de crédito em até 12x sem juros ou via PIX/boleto à vista, garantindo o desconto máximo.'
    },
    {
      question: 'Já sou assinante. Posso mudar de plano?',
      answer: 'Sim! A promoção é válida para novos usuários, ex-assinantes e assinantes atuais que desejem renovar ou fazer upgrade. Entre em contato com nosso suporte para realizar a transição.'
    }
  ];

  return (
    <>
      <SEO
        title="Guru do Dindin - Seu Guru das Finanças Pessoais"
        description="Controle total do seu dinheiro com categorização inteligente e análises em tempo real. Assinatura anual com descontos exclusivos!"
        keywords="finanças pessoais, controle financeiro, orçamento, guru do dindin, open finance"
      />

      <div className="min-h-screen bg-white">
        {/* Header/Navbar */}
        <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="Guru do Dindin" className="h-12 w-auto" />
                <span className="text-2xl font-bold text-primary-600">Guru do Dindin</span>
              </div>

              <nav className="hidden md:flex items-center space-x-8">
                <a href="#recursos" className="text-gray-700 hover:text-primary-600 transition-colors">Recursos</a>
                <a href="#planos" className="text-gray-700 hover:text-primary-600 transition-colors">Planos</a>
                <a href="#depoimentos" className="text-gray-700 hover:text-primary-600 transition-colors">Depoimentos</a>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">Entrar</Link>
                <button
                  onClick={handleSubscribeClick}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Quero ser assinante
                </button>
              </nav>

              <div className="md:hidden">
                <button
                  onClick={handleSubscribeClick}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Assinar
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
              <span className="text-white drop-shadow-lg">GURU DO DINDIN:</span><br />
              <span className="text-white opacity-90 drop-shadow-lg">A Organização Financeira que Você Precisa</span>
            </h1>
            <p className="text-xl md:text-2xl font-light mb-8 max-w-3xl mx-auto opacity-90 drop-shadow">
              Comece 2025 com o mapa definitivo para suas finanças. Assine agora o Plano Anual e garanta condições exclusivas!
            </p>

            <div className="bg-white text-primary-600 text-2xl font-bold inline-block px-8 py-3 rounded-xl shadow-lg mb-10 border-2 border-primary-600">
              DESCONTO EXCLUSIVO NA ASSINATURA ANUAL!
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href="#planos"
                className="bg-white text-primary-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl inline-flex items-center justify-center space-x-2"
              >
                <span>Escolher Meu Plano Anual</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            <p className="text-sm text-white opacity-80 drop-shadow">
              Condições especiais por tempo limitado. Aproveite!
            </p>
          </div>
        </section>

        {/* Bancos Conectados Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Controle financeiro integrado: Abertura para o Open Finance
            </h2>
            <div className="flex justify-center">
              <img
                src="/bancos.png"
                alt="Bancos conectados via Open Finance"
                className="max-w-full h-auto rounded-2xl shadow-xl"
              />
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Conexão segura via Open Finance com as maiores instituições do país.
            </p>
          </div>
        </section>

        {/* Planos Section */}
        <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12">
              Escolha o Plano Perfeito para Você
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`
                    relative bg-white p-6 rounded-xl shadow-lg
                    transition-all transform hover:-translate-y-2 duration-300
                    ${plan.popular ? 'ring-4 ring-yellow-400' : ''}
                  `}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-4 py-1 rounded-full font-bold text-sm shadow-lg flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span>MAIS POPULAR</span>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    {plan.icon}
                  </div>

                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 mb-6 text-sm">{plan.description}</p>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 line-through">
                      Preço Regular: R$ {plan.originalPrice.toFixed(2)}
                    </p>
                    <p className="text-4xl font-extrabold text-primary-600 mb-1">
                      R$ {plan.price.toFixed(2)}{' '}
                      <span className="text-lg font-normal text-gray-600">à vista</span>
                    </p>
                    <p className="text-sm font-bold text-primary-600 mb-3">
                      {plan.discount}% OFF na Anual
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      ou 12x de R$ {plan.monthlyPrice.toFixed(2)}/mês
                    </p>
                  </div>

                  <ul className="text-left space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-gray-600">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleSubscribeClick}
                    className={`
                      w-full py-3 rounded-lg font-semibold transition-all
                      ${plan.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                      }
                    `}
                  >
                    Assinar {plan.name}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubscribeClick}
              className="bg-gradient-to-r from-primary-600 to-purple-600 text-white px-10 py-4 rounded-lg font-bold text-lg hover:from-primary-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl inline-flex items-center space-x-2"
            >
              <span>Quero ser assinante</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section id="recursos" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                  className="bg-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 duration-300"
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

        {/* Depoimentos Section */}
        <section id="depoimentos" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
              O Que Nossos Gurus Dizem
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-md border-t-4 border-primary-600"
                >
                  <div className="flex text-lg mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="italic text-gray-700 mb-4">"{testimonial.text}"</p>
                  <p className="font-semibold text-gray-800">- {testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
              Tira Dúvidas: Perguntas Frequentes
            </h2>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="bg-gray-50 rounded-lg px-6 py-4 shadow-sm"
                >
                  <summary className="cursor-pointer font-semibold text-gray-900 flex justify-between items-center">
                    {item.question}
                    <span className="text-2xl">▼</span>
                  </summary>
                  <p className="mt-4 text-gray-600">{item.answer}</p>
                </details>
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
            <button
              onClick={handleSubscribeClick}
              className="inline-flex items-center space-x-3 bg-white text-primary-600 px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
            >
              <span>Começar Agora</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <img src="/logobranco.png" alt="Guru do Dindin" className="h-10 w-auto" />
                  <span className="text-xl font-bold text-white">Guru do Dindin</span>
                </div>
                <p className="text-gray-400 mb-4">
                  Seu Guru das Finanças Pessoais. Controle inteligente do seu dinheiro.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">Produto</h4>
                <ul className="space-y-2">
                  <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                  <li><a href="#planos" className="hover:text-white transition-colors">Planos</a></li>
                  <li><Link to="/register" className="hover:text-white transition-colors">Começar</Link></li>
                </ul>
              </div>

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
              <p className="text-xs mt-2">Os preços e condições desta página são promocionais para a Assinatura Anual.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
