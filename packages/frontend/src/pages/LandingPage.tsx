import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Shield,
  Smartphone,
  PieChart,
  Zap,
  ArrowRight,
  Target,
  Star
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

  // OCULTO: Array de planos não utilizado após remover seção de planos
  // const plans = [
  //   {
  //     name: 'Plano Manual',
  //     description: 'Controle total das suas finanças',
  //     originalPrice: 0,
  //     price: 0,
  //     discount: 0,
  //     monthlyPrice: 0,
  //     popular: false,
  //     features: [
  //       'Sem Conexão Bancária',
  //       'Controle manual de contas e cartões',
  //       'Importação por CSV do Excel',
  //       'Recategorização automática',
  //       'Relatórios completos'
  //     ],
  //     icon: <Shield className="w-12 h-12" />
  //   },
  //   // OCULTO: Trial do Pluggy expirou - Planos com conexão bancária temporariamente desabilitados
  //   // {
  //   //   name: 'Plano Conectado',
  //   //   description: 'Ideal para quem quer agilidade',
  //   //   originalPrice: 358.80,
  //   //   price: 249.90,
  //   //   discount: 30,
  //   //   monthlyPrice: 29.90,
  //   //   popular: true,
  //   //   features: [
  //   //     'Tudo do Plano Manual',
  //   //     'Até 3 contas/cartões conectados',
  //   //     'Conexão via Open Finance',
  //   //     'Importe com 1 clique',
  //   //     'Categorize automaticamente',
  //   //     'Mais agilidade'
  //   //   ],
  //   //   icon: <Zap className="w-12 h-12" />
  //   // },
  //   // {
  //   //   name: 'Plano Conectado Plus',
  //   //   description: 'Para múltiplas contas bancárias',
  //   //   originalPrice: 502.90,
  //   //   price: 352.90,
  //   //   discount: 30,
  //   //   monthlyPrice: 41.90,
  //   //   features: [
  //   //     'Tudo do Plano Conectado',
  //   //     'Até 10 contas/cartões',
  //   //     'Multi-Empresas/Famílias',
  //   //     'Relatórios PDF/Excel',
  //   //     'Suporte Dedicado 24h'
  //   //   ],
  //   //   icon: <Crown className="w-12 h-12" />
  //   // }
  // ];

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
                  Planos
                </button>
              </nav>

              <div className="md:hidden flex items-center space-x-2">
                <a href="#planos" className="text-primary-600 hover:text-primary-700 transition-colors text-sm font-medium">
                  Planos
                </a>
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
        <section className="pt-16 pb-0 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 text-white relative overflow-hidden min-h-[480px]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative h-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Left side - Text */}
                <div className="text-center lg:text-left py-12 lg:py-20">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                    A Organização Financeira<br />
                    <span className="text-yellow-300">que Você Precisa</span>
                  </h1>
                  <p className="text-xl sm:text-2xl mb-8 text-white/90">
                    Controle seus gastos com apenas um clique usando o Open Finance
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link
                      to="/register"
                      className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl inline-flex items-center justify-center space-x-2"
                    >
                      <span>Experimente grátis!</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Visual (absolute positioned to extend to edges) */}
            <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2">
              <img
                src="/Gemini.png"
                alt="Guru do Dindin Dashboard"
                className="absolute right-0 bottom-0 h-full w-auto max-w-none object-cover object-left"
              />
            </div>

            {/* Mobile image */}
            <div className="lg:hidden flex justify-center px-4">
              <img
                src="/Gemini.png"
                alt="Guru do Dindin Dashboard"
                className="w-full max-w-md h-auto"
              />
            </div>
          </div>
        </section>

        {/* Open Finance Section - Design Limpo */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Lado Esquerdo - Texto */}
              <div className="order-2 lg:order-1">
                {/* Header com badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-gray-900 font-semibold text-lg">Conexão Bancária</span>
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    NOVO
                  </span>
                </div>

                {/* Título Principal */}
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  Importe suas finanças<br />
                  com um clique
                </h2>

                {/* Subtítulo */}
                <p className="text-lg text-gray-600 mb-10">
                  Conecte seus bancos e veja as suas movimentações bancárias centralizadas no Guru do Dindin com a <strong>tecnologia do Open Finance.</strong>
                </p>

                {/* Lista de Benefícios com barra lateral */}
                <div className="space-y-6">
                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">Menos trabalho, mais tempo livre</h4>
                      <p className="text-gray-600">Seus lançamentos chegam prontos direto do seu banco.</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">Seus gastos sob controle desde o primeiro dia</h4>
                      <p className="text-gray-600">Traga seu histórico de <strong>90 dias</strong> e não comece do zero.</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">Conecte contas PF e PJ sem dor de cabeça</h4>
                      <p className="text-gray-600">Finanças pessoais e do negócio organizadas no mesmo lugar.</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">Segurança em primeiro lugar</h4>
                      <p className="text-gray-600">Tecnologia do Banco Central para proteger seus dados e sua privacidade.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lado Direito - Imagem */}
              <div className="order-1 lg:order-2 flex justify-center">
                <img
                  src="/bancos.png"
                  alt="Bancos conectados via Open Finance"
                  className="max-w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Seção Como Funciona - Vídeo */}
        <section className="py-24 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Lado Esquerdo - Texto */}
              <div>
                {/* Header com badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-gray-900 font-semibold text-lg">Open Finance (parceiro Pluggy)</span>
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    NOVO
                  </span>
                </div>

                {/* Título Principal */}
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-12 leading-tight tracking-tight">
                  <span className="text-gray-900">Veja como é simples</span><br />
                  <span className="text-gray-900">usar a </span>
                  <span className="text-purple-600">Conexão Bancária</span><br />
                  <span className="text-gray-900">do Guru do Dindin.</span>
                </h2>

                {/* Passos */}
                <div className="space-y-6">
                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">
                        1º Passo – Conecte seu banco ao Guru do Dindin
                      </h4>
                      <p className="text-gray-500">
                        Integre sua conta bancária para sincronizar seus dados automaticamente via Open Finance.
                      </p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">
                        2º Passo – Importe seu histórico de transações
                      </h4>
                      <p className="text-gray-500">
                        Traga as movimentações dos últimos 90 dias e tenha tudo em um só lugar.
                      </p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">
                        3º Passo – Conecte cartões de crédito e débito
                      </h4>
                      <p className="text-gray-500">
                        PF e PJ em um só lugar. Tenha controle total de seus gastos e receitas.
                      </p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">
                        4º Passo – Categorize com auxílio da IA
                      </h4>
                      <p className="text-gray-500">
                        Suas transações são categorizadas automaticamente. Recategorize com 1 clique se preferir.
                      </p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="w-1 bg-yellow-400 rounded-full mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">
                        5º Passo – Defina Budgets por categoria
                      </h4>
                      <p className="text-gray-500">
                        Saiba onde e quanto você excedeu em cada categoria. Controle seus limites!
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <span className="text-primary-600 font-bold text-lg">E muito mais!</span>
                  </div>
                </div>
              </div>

              {/* Lado Direito - Vídeo */}
              <div className="flex justify-center">
                <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md">
                  <video
                    src="https://www.pluggy.ai/showcase/pluggy-connect.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="rounded-2xl w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OCULTO: Seção de Planos removida - Card do Plano Manual já aparece ao lado dos bancos */}
        {/* <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
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
                    {plan.price === 0 ? (
                      // Plano Grátis
                      <div className="text-center py-4">
                        <div className="inline-block bg-gradient-to-r from-yellow-100 to-amber-100 px-6 py-3 rounded-xl border-2 border-yellow-400">
                          <p className="text-4xl font-extrabold text-gray-900">
                            R$ 0,00
                          </p>
                          <p className="text-sm text-gray-700 font-bold mt-1">
                            100% Gratuito
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Planos pagos
                      <>
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
                      </>
                    )}
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
                        : 'bg-primary-600 text-white hover:bg-primary-700'
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
              className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-10 py-4 rounded-lg font-bold text-lg hover:from-primary-700 hover:to-primary-700 transition-all transform hover:scale-105 shadow-xl inline-flex items-center space-x-2"
            >
              <span>Quero ser assinante</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section> */}

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

            {/* Bloco Categorização: Features lado a lado com imagem no centro */}
            <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-6 items-center mb-24">
              {/* Features Esquerda */}
              <div className="space-y-8">
                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Categorização Inteligente</h3>
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <PieChart className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Suas transações são categorizadas automaticamente usando IA. Entenda para onde vai seu dinheiro.</p>
                </div>

                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Subcategorias Detalhadas</h3>
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Alimentação, Transporte, Lazer, Saúde e muito mais. Organize seus gastos com precisão.</p>
                </div>

                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Recategorize com 1 Clique</h3>
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Não gostou da categoria? Mude facilmente e o sistema aprende suas preferências.</p>
                </div>
              </div>

              {/* Imagem Central */}
              <div className="flex justify-center">
                <img
                  src="/Categorizacao%20de%20despezas.png"
                  alt="Categorização Inteligente de Despesas"
                  className="max-w-2xl w-full h-auto rounded-xl shadow-2xl border border-gray-100"
                />
              </div>

              {/* Features Direita */}
              <div className="space-y-8">
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Gráficos e Relatórios</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Visualize seus gastos em gráficos intuitivos. Saiba exatamente onde economizar.</p>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">100% Seguro</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Seus dados são criptografados e protegidos. Privacidade garantida.</p>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary-100 text-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Acesso em Qualquer Lugar</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Desktop ou mobile, acompanhe suas finanças de onde estiver.</p>
                </div>
              </div>
            </div>

            {/* Bloco Budget: Features lado a lado com imagem no centro */}
            <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-6 items-center">
              {/* Features Esquerda */}
              <div className="space-y-8">
                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Custos Fixos e Variáveis</h3>
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Defina custos fixos, variáveis e de investimentos. Tenha uma visão clara de onde economizar.</p>
                </div>

                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Alertas de Limite</h3>
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Receba avisos quando estiver próximo ou ultrapassar o limite. Sem surpresas no fim do mês!</p>
                </div>

                <div className="text-right lg:text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Gráficos Mensais</h3>
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Barras mensais mostram a distribuição dos gastos por categoria para melhor definir seus budgets.</p>
                </div>
              </div>

              {/* Imagem Central */}
              <div className="flex justify-center">
                <img
                  src="/Budget.png"
                  alt="Controle de Orçamentos"
                  className="max-w-2xl w-full h-auto rounded-xl shadow-2xl border border-gray-100"
                />
              </div>

              {/* Features Direita */}
              <div className="space-y-8">
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Regra 50/30/20</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Siga a regra de ouro: 50% fixos, 30% variáveis, 20% investimentos. O sistema te avisa se sair do limite.</p>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Subcategorias</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Detalhe cada categoria em subcategorias. Veja exatamente onde está gastando mais dentro de cada área.</p>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Saldo Disponível</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Veja em tempo real quanto ainda pode gastar no mês. Verde = dentro do limite, Vermelho = acima.</p>
                </div>
              </div>
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
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-600 text-white">
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
