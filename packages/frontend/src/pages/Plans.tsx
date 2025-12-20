import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Check,
  Star,
  Shield,
  Loader2,
  Zap,
  Crown,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import SEO from '../components/SEO';
import { subscriptionApi } from '../services/api';

interface Plan {
  id: string;
  type: 'manual' | 'conectado' | 'conectado_plus';
  name: string;
  description: string;
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
  const [endDate, setEndDate] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);

  const plans: Plan[] = [
    {
      id: 'manual',
      type: 'manual',
      name: 'Plano Manual',
      description: 'Controle manual das suas finanças',
      monthlyPrice: 13.90,
      maxAccounts: 0,
      icon: <Shield className="w-8 h-8" />,
      features: [
        'Controle manual de contas e cartões',
        'Importação por CSV do Excel',
        'Relatórios completos',
        'Sem conexão bancária automática',
        'Sem categorização com IA'
      ]
    },
    {
      id: 'conectado',
      type: 'conectado',
      name: 'Plano Conectado',
      description: 'Ideal para quem quer agilidade',
      monthlyPrice: 29.90,
      maxAccounts: 2,
      popular: true,
      icon: <Zap className="w-8 h-8" />,
      features: [
        'Tudo do Plano Manual',
        'Até 2 cartões conectados via Open Finance',
        'Conexão PF e PJ',
        'Importe lançamentos com 1 clique',
        'Categorização automática (sem IA)'
      ]
    },
    {
      id: 'conectado_plus',
      type: 'conectado_plus',
      name: 'Plano Conectado Plus',
      description: 'Para quem tem múltiplas contas',
      monthlyPrice: 41.90,
      maxAccounts: 4,
      icon: <Crown className="w-8 h-8" />,
      features: [
        'Tudo do Plano Conectado',
        'Até 4 cartões conectados via Open Finance',
        'Categorização com IA',
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
            alert('🎉 Plano ativado!');
          } else if (attempts >= maxAttempts) {
            // Timeout - webhook pode estar demorando
            setProcessingPayment(false);
            clearInterval(pollInterval);
            alert('⏳ Pagamento em processamento. Atualize em instantes.');
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

      // Chamar backend para restaurar trial se ainda houver dias
      subscriptionApi.cancelCheckout()
        .then(() => {
          console.log('✅ Cancel checkout processed');
          // Re-fetch para garantir que os dados do trial estão corretos
          fetchCurrentSubscription();
        })
        .catch(err => {
          console.error('❌ Error canceling checkout:', err);
          // Re-fetch mesmo se der erro
          fetchCurrentSubscription();
        });
    }
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const { data } = await subscriptionApi.getCurrentSubscription();
      console.log('📦 [Plans] Subscription data received:', data);
      if (data.subscription) {
        setCurrentPlan(data.subscription.plan_type);
        setSubscriptionStatus(data.subscription.status);
        setTrialEndDate(data.subscription.trial_end_date);
        setEndDate(data.subscription.end_date);
        setStripeSubscriptionId(data.subscription.payment_processor_subscription_id);
        console.log('✅ [Plans] Subscription set:', {
          plan: data.subscription.plan_type,
          status: data.subscription.status,
          trialEndDate: data.subscription.trial_end_date,
          endDate: data.subscription.end_date,
          stripeId: data.subscription.payment_processor_subscription_id
        });
      } else {
        // Não tem assinatura
        setCurrentPlan(null);
        setSubscriptionStatus(null);
        setTrialEndDate(null);
        setEndDate(null);
        setStripeSubscriptionId(null);
        console.log('⚠️ [Plans] No subscription found');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (canceling) return;

    setCanceling(true);
    try {
      const { data } = await subscriptionApi.cancelSubscription();
      console.log('✅ Subscription canceled:', data);
      alert('✅ Assinatura cancelada com sucesso!');
      setShowCancelConfirm(false);
      // Recarregar dados
      fetchCurrentSubscription();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      alert('❌ Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setCanceling(false);
    }
  };

  const calculateDaysRemaining = () => {
    // Usa trial_end_date se existir, caso contrário usa end_date
    const dateToUse = trialEndDate || endDate;
    if (!dateToUse) return 0;

    const now = new Date();
    const targetDate = new Date(dateToUse);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isOnTrial = subscriptionStatus === 'trial';
  const isPending = subscriptionStatus === 'pending';
  const isActive = subscriptionStatus === 'active';
  const daysRemaining = calculateDaysRemaining();

  console.log('🎯 [Plans] Current state:', {
    subscriptionStatus,
    isOnTrial,
    isPending,
    isActive,
    daysRemaining,
    trialEndDate,
    endDate,
    initializing,
    processingPayment
  });

  const handleSelectPlan = async (plan: Plan) => {
    if (loading) return;

    // Não permitir se já está no plano pago
    if (isActive && currentPlan === plan.type) {
      alert('✅ Você já está neste plano!');
      return;
    }

    setLoading(true);
    try {
      const { data } = await subscriptionApi.createSubscription(plan.type, 'monthly');

      if (data.checkoutUrl) {
        // Redirecionar para Stripe Checkout (página segura do Stripe)
        window.location.href = data.checkoutUrl;
      } else {
        alert('❌ Erro ao criar sessão de pagamento.');
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      alert('❌ Erro ao processar assinatura.');
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
        <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          {/* Título */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
              Escolha o Plano Perfeito
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comece a organizar suas finanças hoje. Planos mensais com 7 dias grátis!
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
            {/* Mensagem de Trial/Pending Ativo (AMARELA) */}
            {!processingPayment && !initializing && (isOnTrial || isPending) && daysRemaining > 0 && (
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
            {/* Mensagem Sem Plano (VERMELHA) - Só mostra se NÃO tem dias restantes */}
            {!processingPayment && !initializing && !isActive && daysRemaining < 0 && (
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
                {endDate && (
                  <p className="text-center text-green-600 text-xs mt-1">
                    Próxima cobrança: {new Date(endDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="mt-3 mx-auto block text-sm text-red-600 hover:text-red-700 underline"
                >
                  Cancelar assinatura
                </button>
              </div>
            )}

            {/* Botão de cancelar para TRIAL/PENDING */}
            {!processingPayment && !initializing && (isOnTrial || isPending) && daysRemaining > 0 && stripeSubscriptionId && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-sm text-gray-500 hover:text-red-600 underline"
                >
                  Cancelar trial (não será cobrado)
                </button>
              </div>
            )}
          </div>

          {/* Cards de Planos - Todos os 3 lado a lado */}
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

                  {/* Preço Mensal */}
                  <div className="mb-6">
                    <div className="flex items-baseline mb-2">
                      <span className="text-4xl font-extrabold text-primary-600">
                        R$ {plan.monthlyPrice.toFixed(2)}
                      </span>
                      <span className="ml-2 text-gray-600">/mês</span>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-green-800 font-medium">
                        🎉 7 dias grátis para testar!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Cancele a qualquer momento nos primeiros 7 dias e não será cobrado.
                      </p>
                    </div>
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

          {/* Info sobre 7 dias grátis */}
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg mb-6">
            <h3 className="text-xl font-bold mb-3 text-center text-blue-900 flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              Garantia de 7 Dias Grátis
            </h3>
            <div className="text-center space-y-2">
              <p className="text-blue-800 font-medium">
                Experimente qualquer plano por 7 dias sem compromisso.
              </p>
              <p className="text-blue-700 text-sm">
                Se você cancelar dentro dos primeiros 7 dias, <strong>não será cobrado</strong>. Sem perguntas, sem burocracia.
              </p>
              <p className="text-blue-600 text-xs">
                Após o período de teste, a cobrança será realizada automaticamente via cartão de crédito.
              </p>
            </div>
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

        {/* Modal de Confirmação de Cancelamento */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                Cancelar {isOnTrial || isPending ? 'Trial' : 'Assinatura'}?
              </h3>

              <p className="text-center text-gray-600 mb-4">
                {isOnTrial || isPending ? (
                  <>
                    Você está no período de teste gratuito. Se cancelar agora,
                    <strong className="text-green-600"> não será cobrado</strong>.
                  </>
                ) : (
                  <>
                    Sua assinatura será cancelada e você perderá acesso às
                    funcionalidades premium no fim do período atual.
                  </>
                )}
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Atenção:</strong> Suas contas bancárias conectadas serão
                  desativadas, mas seus dados serão mantidos caso você volte.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={canceling}
                  className="flex-1 py-3 px-4 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Manter {isOnTrial || isPending ? 'Trial' : 'Assinatura'}
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="flex-1 py-3 px-4 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {canceling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Sim, Cancelar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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
