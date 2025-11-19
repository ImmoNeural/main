import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Check,
  Crown,
  Star,
  Zap,
  Shield,
  Loader2
} from 'lucide-react';
import SEO from '../components/SEO';
import { subscriptionApi } from '../services/api';

interface Plan {
  id: string;
  type: 'manual' | 'conectado' | 'conectado_plus';
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  discount: number;
  monthlyPrice: number;
  maxAccounts: number;
  popular?: boolean;
  features: string[];
  icon: React.ReactNode;
}

const Plans = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const plans: Plan[] = [
    {
      id: 'manual',
      type: 'manual',
      name: 'Plano Manual',
      description: 'Para quem gosta de controlar cada detalhe',
      originalPrice: 166.90,
      price: 133.90,
      discount: 20,
      monthlyPrice: 13.90,
      maxAccounts: 0,
      icon: <Shield className="w-8 h-8" />,
      features: [
        'Sem Conexão Bancária',
        'Controle manual de contas e cartões',
        'Categorias e subcategorias personalizadas',
        'Limite de gastos ilimitados',
        'Alerta de contas a pagar',
        'Relatórios completos e fáceis'
      ]
    },
    {
      id: 'conectado',
      type: 'conectado',
      name: 'Plano Conectado',
      description: 'Ideal para agilidade com poucas contas',
      originalPrice: 358.80,
      price: 249.90,
      discount: 30,
      monthlyPrice: 29.90,
      maxAccounts: 3,
      popular: true,
      icon: <Zap className="w-8 h-8" />,
      features: [
        'Tudo do Plano Manual',
        'Até 3 contas/cartões conectados',
        'Conexão via Open Finance',
        'Importe lançamentos com 1 clique',
        'Categorização automática',
        'Mais agilidade na organização'
      ]
    },
    {
      id: 'conectado_plus',
      type: 'conectado_plus',
      name: 'Plano Conectado Plus',
      description: 'Para quem tem múltiplas contas bancárias',
      originalPrice: 502.90,
      price: 352.90,
      discount: 30,
      monthlyPrice: 41.90,
      maxAccounts: 10,
      icon: <Crown className="w-8 h-8" />,
      features: [
        'Tudo do Plano Manual',
        'Tudo do Plano Conectado',
        'Até 10 contas/cartões conectados',
        'Controle Multi-Empresas/Famílias',
        'Relatórios Personalizados (PDF/Excel)',
        'Suporte Dedicado 24h'
      ]
    }
  ];

  useEffect(() => {
    fetchCurrentSubscription();

    // Verificar se voltou do Stripe Checkout (Sucesso)
    const success = searchParams.get('success');
    if (success === 'true') {
      setProcessingPayment(true);
      // Limpar URL
      setSearchParams({});

      // Fazer polling para esperar webhook processar (até 15 segundos)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`Verificando pagamento... tentativa ${attempts}/${maxAttempts}`);

        try {
          const { data } = await subscriptionApi.getCurrentSubscription();
          if (data.subscription && data.subscription.status === 'active') {
            // Pagamento processado!
            setCurrentPlan(data.subscription.plan_type);
            setSubscriptionStatus(data.subscription.status);
            setTrialEndDate(data.subscription.trial_end_date);
            setProcessingPayment(false);
            clearInterval(pollInterval);
            alert('🎉 Pagamento confirmado! Seu plano foi ativado com sucesso.');
          } else if (attempts >= maxAttempts) {
            // Timeout - webhook pode estar demorando
            setProcessingPayment(false);
            clearInterval(pollInterval);
            alert('⏳ Seu pagamento está sendo processado. Atualize a página em alguns instantes.');
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error);
        }
      }, 1500); // Verifica a cada 1.5 segundos

      // Cleanup
      return () => clearInterval(pollInterval);
    }

    // Verificar se voltou do Stripe Checkout (Cancelado)
    const canceled = searchParams.get('canceled');
    if (canceled === 'true') {
      console.log('❌ Usuário cancelou o checkout no Stripe');
      // Limpar URL
      setSearchParams({});
      // Re-fetch para garantir que os dados do trial estão corretos
      fetchCurrentSubscription();
    }
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const { data } = await subscriptionApi.getCurrentSubscription();
      if (data.subscription) {
        setCurrentPlan(data.subscription.plan_type);
        setSubscriptionStatus(data.subscription.status);
        setTrialEndDate(data.subscription.trial_end_date);
      } else {
        // Não tem assinatura
        setCurrentPlan(null);
        setSubscriptionStatus(null);
        setTrialEndDate(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setInitializing(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!trialEndDate) return 0;
    const now = new Date();
    const endDate = new Date(trialEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isOnTrial = subscriptionStatus === 'trial';
  const isActive = subscriptionStatus === 'active';
  const daysRemaining = calculateDaysRemaining();

  const handleSelectPlan = async (plan: Plan) => {
    if (loading) return;

    // Não permitir se já está no plano pago
    if (isActive && currentPlan === plan.type) {
      alert('Você já está neste plano!');
      return;
    }

    setLoading(true);
    try {
      const { data } = await subscriptionApi.createSubscription(plan.type, 'yearly');

      if (data.checkoutUrl) {
        // Redirecionar para Stripe Checkout (página segura do Stripe)
        window.location.href = data.checkoutUrl;
      } else {
        alert('Erro ao criar sessão de pagamento. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao processar assinatura. Tente novamente.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Escolha seu Plano - Guru do Dindin"
        description="Escolha o plano ideal para organizar suas finanças. Planos Manual, Conectado ou Conectado Plus com descontos especiais."
        keywords="planos, assinatura, preços, guru do dindin"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Container principal */}
        <div className="relative min-h-screen px-4 py-4">
          {/* Título */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Escolha o Plano Perfeito
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comece 2025 com organização financeira de verdade. Descontos especiais na assinatura anual!
            </p>

            {/* Status da Assinatura */}
            {processingPayment && (
              <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-primary-50 to-pink-50 border-2 border-primary-200 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <p className="text-center text-primary-800 font-semibold">
                    Processando seu pagamento...
                  </p>
                </div>
                <p className="text-center text-primary-600 text-sm mt-1">
                  Aguarde enquanto confirmamos sua assinatura
                </p>
              </div>
            )}
            {/* Mensagem de Trial Ativo (AMARELA) */}
            {!processingPayment && !initializing && isOnTrial && daysRemaining > 0 && (
              <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-4 shadow-md">
                <p className="text-center text-yellow-900 font-semibold">
                  🎉 Período de teste ativo! Restam {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} grátis
                </p>
                <p className="text-center text-yellow-700 text-sm mt-1">
                  Aproveite para testar todas as funcionalidades. Depois escolha seu plano!
                </p>
              </div>
            )}
            {/* Mensagem de Trial Expirado (VERMELHA) - Só mostra se trial expirou */}
            {!processingPayment && !initializing && !isActive && daysRemaining === 0 && trialEndDate && (
              <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
                <p className="text-center text-red-800 font-bold text-lg">
                  ⏰ Seu trial de 7 dias expirou!
                </p>
                <p className="text-center text-red-700 text-base mt-2">
                  Para continuar aproveitando todas as funcionalidades, escolha um plano abaixo.
                </p>
                <p className="text-center text-red-600 text-sm mt-2 font-semibold">
                  💡 Todas as suas contas e transações estão salvas e voltarão quando você assinar!
                </p>
              </div>
            )}
            {/* Mensagem Sem Plano (VERMELHA) - Só mostra se nunca teve trial OU trial já expirou */}
            {!processingPayment && !initializing && !isActive && !isOnTrial && daysRemaining <= 0 && (
              <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
                <p className="text-center text-red-800 font-bold text-lg">
                  ⚠️ Você não possui um plano ativo
                </p>
                <p className="text-center text-red-700 text-base mt-2">
                  Escolha um plano abaixo para continuar usando o Guru do Dindin
                </p>
                <p className="text-center text-red-600 text-sm mt-2 font-semibold">
                  💡 Todas as suas contas e transações estão salvas e voltarão quando você assinar!
                </p>
              </div>
            )}
            {!processingPayment && isActive && (
              <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-md">
                <p className="text-center text-green-800 font-semibold">
                  ✅ Plano ativo: {currentPlan === 'manual' ? 'Manual' : currentPlan === 'conectado' ? 'Conectado' : 'Conectado Plus'}
                </p>
                <p className="text-center text-green-600 text-sm mt-1">
                  Você pode fazer upgrade para outro plano a qualquer momento
                </p>
              </div>
            )}
          </div>

          {/* Cards de Planos */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`
                  relative bg-white rounded-2xl shadow-2xl overflow-hidden
                  transform transition-all duration-300 hover:scale-105 hover:shadow-3xl
                  ${plan.popular ? 'ring-4 ring-yellow-400' : ''}
                  animate-slide-up
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-4 py-1 rounded-bl-xl font-bold text-sm flex items-center space-x-1 shadow-lg">
                    <Star className="w-4 h-4 fill-current" />
                    <span>MAIS POPULAR</span>
                  </div>
                )}

                {/* Conteúdo do Card */}
                <div className="p-6 flex flex-col h-full">
                  {/* Ícone e Nome */}
                  <div className="mb-6">
                    <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-16 h-16 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>

                  {/* Preço */}
                  <div className="mb-6">
                    <div className="flex items-baseline space-x-2 mb-2">
                      <span className="text-sm text-gray-500 line-through">
                        R$ {plan.originalPrice.toFixed(2)}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                        {plan.discount}% OFF
                      </span>
                    </div>
                    <div className="flex items-baseline mb-1">
                      <span className="text-4xl font-extrabold text-primary-600">
                        R$ {plan.price.toFixed(2)}
                      </span>
                      <span className="ml-2 text-gray-600">/ano</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      ou 12x de R$ {plan.monthlyPrice.toFixed(2)}/mês
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loading || (isActive && currentPlan === plan.type)}
                    className={`
                      w-full py-3 px-4 rounded-lg font-semibold transition-all
                      flex items-center justify-center space-x-2
                      ${plan.popular
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transform active:scale-95
                    `}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (isActive && currentPlan === plan.type) ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Plano Atual</span>
                      </>
                    ) : (isOnTrial && currentPlan === plan.type) ? (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>Fazer Upgrade</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>Assinar Agora</span>
                      </>
                    )}
                  </button>

                  {(isActive && currentPlan === plan.type) && (
                    <p className="text-center text-sm text-green-600 mt-2 font-medium">
                      ✓ Você está neste plano
                    </p>
                  )}
                  {(isOnTrial && currentPlan === plan.type) && (
                    <p className="text-center text-sm text-blue-600 mt-2 font-medium">
                      🎉 Plano de teste ativo - Faça upgrade para continuar após o trial
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Informações Adicionais */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-900">Por que escolher o Guru do Dindin?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p className="font-semibold mb-1 text-gray-900">100% Seguro</p>
                <p className="text-sm text-gray-600">Seus dados protegidos com criptografia</p>
              </div>
              <div>
                <Star className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p className="font-semibold mb-1 text-gray-900">Suporte Dedicado</p>
                <p className="text-sm text-gray-600">Equipe pronta para ajudar você</p>
              </div>
              <div>
                <Zap className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p className="font-semibold mb-1 text-gray-900">Cancele quando quiser</p>
                <p className="text-sm text-gray-600">Sem fidelidade ou multas</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Guru do Dindin. Todos os direitos reservados.</p>
          </div>
        </div>

        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }

          .animate-slide-up {
            animation: slide-up 0.6s ease-out both;
          }
        `}</style>
      </div>
    </>
  );
};

export default Plans;
