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
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import SEO from '../components/SEO';
import { subscriptionApi } from '../services/api';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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

  // Detectar se está no app mobile
  const isNativeApp = Capacitor.isNativePlatform();
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

    // No app mobile, redirecionar para o site para evitar comissão do Google
    if (Capacitor.isNativePlatform()) {
      const plansUrl = 'https://gurudodindin.com.br/planos';
      try {
        await Browser.open({ url: plansUrl });
      } catch (error) {
        console.error('Error opening browser:', error);
        window.open(plansUrl, '_blank');
      }
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

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Container principal */}
        <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          {/* Cabeçalho da página */}
          <div className="page-header">
            <div className="page-header__titles">
              <span className="icon-chip icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <CreditCard className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <h1 className="page-title">Planos &amp; Assinatura</h1>
                <p className="page-subtitle">Comece a organizar suas finanças hoje · 7 dias grátis</p>
              </div>
            </div>
          </div>

          {/* Avisos e status */}
          <div className="text-center mb-8 animate-fade-in">

            {/* Aviso para usuários do app mobile */}
            {isNativeApp && (
              <div className="info-card mt-4 max-w-2xl mx-auto justify-center">
                <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-600 dark:text-primary-300" />
                <span>Para sua segurança, o pagamento será realizado pelo nosso site</span>
              </div>
            )}

            {/* Status da Assinatura */}
            {processingPayment && (
              <div className="info-card mt-6 max-w-2xl mx-auto flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600 dark:text-primary-300" />
                  <p className="font-semibold text-primary-700 dark:text-primary-300">
                    Processando seu pagamento...
                  </p>
                </div>
                <p className="text-sm mt-1">
                  Aguarde enquanto confirmamos sua assinatura
                </p>
              </div>
            )}
            {/* Mensagem de Trial/Pending Ativo (AMARELA) */}
            {!processingPayment && !initializing && (isOnTrial || isPending) && daysRemaining > 0 && (
              <div className="card mt-6 max-w-2xl mx-auto bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40">
                <p className="text-center text-amber-900 dark:text-amber-300 font-semibold">
                  🎉 Período de teste ativo! Restam {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} grátis
                </p>
                <p className="text-center text-amber-700 dark:text-amber-400 text-sm mt-1">
                  Aproveite para testar todas as funcionalidades. Depois escolha seu plano!
                </p>
              </div>
            )}
            {/* Mensagem de Trial Expirado (VERMELHA) - Só mostra se trial expirou */}
            {!processingPayment && !initializing && !isActive && daysRemaining === 0 && trialEndDate && (
              <div className="card mt-6 max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40">
                <p className="text-center text-red-700 dark:text-red-400 font-bold text-lg">
                  ⏰ Seu trial de 7 dias expirou!
                </p>
                <p className="text-center text-red-700 dark:text-red-400 text-base mt-2">
                  Para continuar aproveitando todas as funcionalidades, escolha um plano abaixo.
                </p>
                <p className="text-center text-red-600 dark:text-red-400 text-sm mt-2 font-semibold">
                  💡 Todas as suas contas e transações estão salvas e voltarão quando você assinar!
                </p>
              </div>
            )}
            {/* Mensagem Sem Plano (VERMELHA) - Só mostra se NÃO tem dias restantes */}
            {!processingPayment && !initializing && !isActive && daysRemaining < 0 && (
              <div className="card mt-6 max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40">
                <p className="text-center text-red-700 dark:text-red-400 font-bold text-lg">
                  ⚠️ Você não possui um plano ativo
                </p>
                <p className="text-center text-red-700 dark:text-red-400 text-base mt-2">
                  Escolha um plano abaixo para continuar usando o Guru do Dindin
                </p>
                <p className="text-center text-red-600 dark:text-red-400 text-sm mt-2 font-semibold">
                  💡 Todas as suas contas e transações estão salvas e voltarão quando você assinar!
                </p>
              </div>
            )}
            {!processingPayment && isActive && (
              <div className="card mt-6 max-w-2xl mx-auto bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-900/40">
                <p className="text-center text-accent-700 dark:text-accent-400 font-semibold">
                  ✅ Plano ativo: {currentPlan === 'manual' ? 'Manual' : currentPlan === 'conectado' ? 'Conectado' : 'Conectado Plus'}
                </p>
                <p className="text-center text-accent-600 dark:text-accent-400 text-sm mt-1">
                  Você pode fazer upgrade para outro plano a qualquer momento
                </p>
                {endDate && (
                  <p className="text-center text-accent-600 dark:text-accent-400 text-xs mt-1">
                    Próxima cobrança: {new Date(endDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="mt-3 mx-auto block text-sm text-red-600 dark:text-red-400 hover:text-red-700 underline"
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
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 underline"
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
                  card card-interactive relative overflow-hidden p-0 flex flex-col
                  ${plan.popular ? 'border-primary-500' : ''}
                  animate-slide-up
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 badge badge-primary rounded-none rounded-bl-2xl">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>MAIS POPULAR</span>
                  </div>
                )}

                {/* Conteúdo do Card */}
                <div className="p-6 flex flex-col h-full">
                  {/* Ícone e Nome */}
                  <div className="mb-6">
                    <div className="icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 mb-4">
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{plan.description}</p>
                  </div>

                  {/* Preço Mensal */}
                  <div className="mb-6">
                    <div className="flex items-baseline mb-2">
                      <span className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">
                        R$ {plan.monthlyPrice.toFixed(2)}
                      </span>
                      <span className="ml-2 text-slate-600 dark:text-slate-400">/mês</span>
                    </div>
                    <div className="rounded-2xl bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-900/40 p-3 mt-3">
                      <p className="text-sm text-accent-700 dark:text-accent-400 font-medium">
                        🎉 7 dias grátis para testar!
                      </p>
                      <p className="text-xs text-accent-600 dark:text-accent-400 mt-1">
                        Cancele a qualquer momento nos primeiros 7 dias e não será cobrado.
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <Check className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loading || (isActive && currentPlan === plan.type)}
                    className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'} disabled:opacity-50 disabled:cursor-not-allowed`}
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
                        {isNativeApp ? <ExternalLink className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        <span>{isNativeApp ? 'Fazer Upgrade no Site' : 'Fazer Upgrade'}</span>
                      </>
                    ) : (
                      <>
                        {isNativeApp ? <ExternalLink className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        <span>{isNativeApp ? 'Assinar no Site' : 'Assinar Agora'}</span>
                      </>
                    )}
                  </button>

                  {(isActive && currentPlan === plan.type) && (
                    <p className="text-center text-sm text-accent-600 dark:text-accent-400 mt-2 font-medium">
                      ✓ Você está neste plano
                    </p>
                  )}
                  {(isOnTrial && currentPlan === plan.type) && (
                    <p className="text-center text-sm text-primary-600 dark:text-primary-400 mt-2 font-medium">
                      🎉 Plano de teste ativo - Faça upgrade para continuar após o trial
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Info sobre 7 dias grátis */}
          <div className="card max-w-4xl mx-auto bg-primary-50/60 dark:bg-primary-900/15 border-primary-100 dark:border-primary-900/30 mb-6">
            <h3 className="text-xl font-bold mb-3 text-center text-primary-700 dark:text-primary-300 flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              Garantia de 7 Dias Grátis
            </h3>
            <div className="text-center space-y-2">
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                Experimente qualquer plano por 7 dias sem compromisso.
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Se você cancelar dentro dos primeiros 7 dias, <strong>não será cobrado</strong>. Sem perguntas, sem burocracia.
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Após o período de teste, a cobrança será realizada automaticamente via cartão de crédito.
              </p>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="card max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-4 text-center text-slate-900 dark:text-white">Por que escolher o Guru do Dindin?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 mx-auto mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="font-semibold mb-1 text-slate-900 dark:text-white">100% Seguro</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Seus dados protegidos com criptografia</p>
              </div>
              <div>
                <div className="icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 mx-auto mb-2">
                  <Star className="w-6 h-6" />
                </div>
                <p className="font-semibold mb-1 text-slate-900 dark:text-white">Suporte Dedicado</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Equipe pronta para ajudar você</p>
              </div>
              <div>
                <div className="icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 mx-auto mb-2">
                  <Zap className="w-6 h-6" />
                </div>
                <p className="font-semibold mb-1 text-slate-900 dark:text-white">Cancele quando quiser</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sem fidelidade ou multas</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            <p>© 2025 Guru do Dindin. Todos os direitos reservados.</p>
          </div>
        </div>

        {/* Modal de Confirmação de Cancelamento */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full animate-scale-in">
              <div className="icon-chip-lg bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300 mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                Cancelar {isOnTrial || isPending ? 'Trial' : 'Assinatura'}?
              </h3>

              <p className="text-center text-slate-600 dark:text-slate-400 mb-4">
                {isOnTrial || isPending ? (
                  <>
                    Você está no período de teste gratuito. Se cancelar agora,
                    <strong className="text-accent-600 dark:text-accent-400"> não será cobrado</strong>.
                  </>
                ) : (
                  <>
                    Sua assinatura será cancelada e você perderá acesso às
                    funcionalidades premium no fim do período atual.
                  </>
                )}
              </p>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>⚠️ Atenção:</strong> Suas contas bancárias conectadas serão
                  desativadas, mas seus dados serão mantidos caso você volte.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={canceling}
                  className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Manter {isOnTrial || isPending ? 'Trial' : 'Assinatura'}
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="flex-1 btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </>
  );
};

export default Plans;
