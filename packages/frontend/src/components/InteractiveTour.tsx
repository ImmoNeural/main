import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';

// Custom tooltip component with Portuguese step counter - Mobile friendly
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  tooltipProps,
  size,
}: TooltipRenderProps) => (
  <div
    {...tooltipProps}
    className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-sm sm:max-w-md mx-2"
    style={{
      padding: '16px',
      borderRadius: 16,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    }}
  >
    {step.content}
    {/* Step counter - above buttons on mobile for better visibility */}
    <div className="text-xs text-gray-400 text-center mt-3 mb-2 sm:hidden">
      Passo {index + 1} de {size}
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <div className="flex items-center">
        {index > 0 && (
          <button
            {...backProps}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-2 py-1"
          >
            Anterior
          </button>
        )}
      </div>
      {/* Step counter - inline on desktop */}
      <div className="text-xs text-gray-400 hidden sm:block">
        Passo {index + 1} de {size}
      </div>
      <div className="flex items-center">
        <button
          {...primaryProps}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {continuous ? (index === size - 1 ? 'Finalizar' : 'Próximo') : 'Fechar'}
        </button>
      </div>
    </div>
  </div>
);

// Componente de animação de categorização
const CategorizationAnimation = () => {
  const [animationStep, setAnimationStep] = useState(0);

  const transactions = [
    { id: 1, description: 'UBER *TRIP', from: 'Não Categorizado', to: 'Transporte', icon: '🚗' },
    { id: 2, description: 'IFOOD *RESTAURANTE', from: 'Não Categorizado', to: 'Alimentação', icon: '🍕' },
    { id: 3, description: 'NETFLIX.COM', from: 'Não Categorizado', to: 'Entretenimento', icon: '📺' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % (transactions.length + 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border border-gray-200 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">✨</span>
        </div>
        <span className="font-semibold text-gray-800 text-sm">Categorizando com IA...</span>
      </div>

      <div className="space-y-2">
        {transactions.map((tx, index) => {
          const isProcessed = animationStep > index;
          const isProcessing = animationStep === index;

          return (
            <div
              key={tx.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-all duration-500 ${
                isProcessed
                  ? 'bg-green-50 border border-green-200'
                  : isProcessing
                    ? 'bg-purple-50 border border-purple-200 animate-pulse'
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg transition-transform duration-300 ${isProcessing ? 'scale-125' : ''}`}>
                  {isProcessed ? tx.icon : '❓'}
                </span>
                <span className="text-xs font-medium text-gray-700">{tx.description}</span>
              </div>
              <div className={`text-xs font-semibold transition-all duration-300 ${
                isProcessed ? 'text-green-600' : isProcessing ? 'text-purple-600' : 'text-gray-400'
              }`}>
                {isProcessed ? tx.to : isProcessing ? 'Processando...' : tx.from}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Progresso</span>
          <span className="font-semibold text-purple-600">
            {Math.min(animationStep, transactions.length)}/{transactions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${(Math.min(animationStep, transactions.length) / transactions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface InteractiveTourProps {
  run: boolean;
  onFinish: () => void;
}

// Mapeamento de qual página cada step deve estar (índice do passo -> página)
// REORGANIZADO: Radar chart agora é passo 5 (índice 4)
const STEP_PAGE_MAP: Record<number, string> = {
  0: '/app/dashboard',  // Boas-vindas
  1: '/app/dashboard',  // Stats cards
  2: '/app/dashboard',  // Period selector
  3: '/app/dashboard',  // Monthly chart
  4: '/app/dashboard',  // Radar chart (MOVIDO PARA CÁ)
  5: '/app/dashboard',  // Connect bank button
  6: '/app/transactions',  // Transactions page
  7: '/app/transactions',  // Filters
  8: '/app/transactions',  // Categorize button
  9: '/app/transactions',  // Category dropdown
  10: '/app/budgets',   // Budgets page
  11: '/app/budgets',   // Financial summary
  12: '/app/budgets',   // Budget cards
  13: '/app/budgets',   // Cost types
  14: '/app/preferences', // Preferences
  15: '/app/accounts',  // Accounts
  16: '/app/dashboard', // Conclusion
};

const InteractiveTour = ({ run, onFinish }: InteractiveTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Refs para controle de estado
  const isProcessingRef = useRef(false);
  const pendingStepRef = useRef<number | null>(null);

  // Definição dos passos do tutorial (17 passos)
  // REORGANIZADO: Radar chart agora é passo 5
  const steps: Step[] = useMemo(() => [
    // Passo 1 (índice 0): Boas-vindas
    {
      target: 'body',
      content: (
        <div className="text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo ao Guru do Dindin!</h2>
          <p className="text-gray-600 text-sm">
            Vamos fazer um tour rápido pelas principais funcionalidades.
            Este tutorial vai te guiar passo a passo pela plataforma.
          </p>
          <p className="text-primary-600 text-xs mt-3 font-medium">
            Tempo estimado: 2 minutos
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    // Passo 2 (índice 1): Cards de resumo
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📊 Visão Geral Financeira</h3>
          <p className="text-gray-600 text-sm">
            Aqui você vê seu <strong>saldo total</strong>, <strong>receitas</strong>,
            <strong> despesas</strong> e <strong>saldo inicial</strong> do período.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Os valores são atualizados automaticamente conforme você conecta contas e categoriza transações.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    // Passo 3 (índice 2): Seletor de período
    {
      target: '[data-tour="period-selector"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📅 Período de Análise</h3>
          <p className="text-gray-600 text-sm">
            Escolha o período que deseja analisar: <strong>1, 2, 3, 6 ou 12 meses</strong>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Todos os gráficos e cards serão atualizados para o período selecionado.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    // Passo 4 (índice 3): Gráfico de barras mensal
    {
      target: '[data-tour="monthly-chart"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📈 Receitas vs Despesas</h3>
          <p className="text-gray-600 text-sm">
            Visualize a evolução das suas <span className="text-green-600 font-semibold">receitas</span> e
            <span className="text-red-600 font-semibold"> despesas</span> mês a mês.
          </p>
          <p className="text-xs text-primary-600 mt-2 font-medium">
            💡 Clique em uma barra para ver as transações daquele mês!
          </p>
        </div>
      ),
      placement: 'top',
    },
    // Passo 5 (índice 4): Gráfico Radar - MOVIDO PARA CÁ
    {
      target: '[data-tour="radar-chart"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📊 Gráfico Radar de Orçamento</h3>
          <p className="text-gray-600 text-sm">
            O <strong>gráfico radar</strong> compara visualmente seu orçamento planejado com os gastos reais por categoria.
          </p>
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-xs text-gray-600">Área azul: Orçamento planejado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-xs text-gray-600">Área vermelha/colorida: Gasto real</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Quando a área colorida ultrapassa a azul, você gastou mais que o orçado naquela categoria.
          </p>
        </div>
      ),
      placement: 'bottom',
      // Permitir scroll para que o gráfico fique visível
    },
    // Passo 6 (índice 5): Botão de conectar banco
    {
      target: '[data-tour="connect-bank-btn"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🏦 Conectar Banco</h3>
          <p className="text-gray-600 text-sm">
            Conecte sua conta bancária via <strong>Open Finance</strong> para importar transações automaticamente.
          </p>
          <ul className="text-xs text-gray-500 mt-2 space-y-1">
            <li>• Seguro e regulamentado pelo Banco Central</li>
            <li>• Suas credenciais não são armazenadas</li>
            <li>• Sincronização automática de transações</li>
          </ul>
        </div>
      ),
      placement: 'bottom',
    },
    // Passo 7 (índice 6): Página de transações
    {
      target: '[data-tour="transactions-page"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📋 Página de Transações</h3>
          <p className="text-gray-600 text-sm">
            Aqui você visualiza <strong>todas as suas transações</strong>,
            pode filtrá-las por categoria, tipo e período.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 8 (índice 7): Filtros de transações
    {
      target: '[data-tour="transactions-filters"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🔍 Filtros Avançados</h3>
          <p className="text-gray-600 text-sm">
            Use os filtros para encontrar transações específicas.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Pesquise por descrição, filtre por categoria ou tipo de custo.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 9 (índice 8): Botão de categorizar
    {
      target: '[data-tour="categorize-btn"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">✨ Categorizar com IA</h3>
          <p className="text-gray-600 text-sm mb-3">
            Clique aqui para categorizar automaticamente suas transações usando
            <strong> inteligência artificial</strong>.
          </p>
          <CategorizationAnimation />
          <p className="text-xs text-gray-500 mt-3">
            A IA analisa a descrição e classifica em categorias como Alimentação, Transporte, etc.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 10 (índice 9): Categorização manual
    {
      target: '[data-tour="category-dropdown"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🏷️ Categorização Manual</h3>
          <p className="text-gray-600 text-sm">
            Você também pode <strong>alterar a categoria manualmente</strong> clicando no dropdown.
          </p>
          <p className="text-xs text-primary-600 mt-2 font-medium">
            💡 O sistema sugere aplicar a mesma mudança em transações similares!
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 11 (índice 10): Página de orçamentos
    {
      target: '[data-tour="budgets-page"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">💰 Página de Orçamentos</h3>
          <p className="text-gray-600 text-sm">
            Gerencie seus <strong>orçamentos mensais</strong> por categoria e acompanhe seus gastos.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 12 (índice 11): Resumo financeiro
    {
      target: '[data-tour="financial-summary"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📊 Resumo Financeiro</h3>
          <p className="text-gray-600 text-sm">
            Veja seu <strong>salário</strong> e quanto está gastando em <strong>custos fixos</strong> e <strong>variáveis</strong>.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 13 (índice 12): Cards de budget
    {
      target: '[data-tour="budget-cards"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📊 Acompanhamento de Gastos</h3>
          <p className="text-gray-600 text-sm">
            Cada card mostra o <strong>progresso do gasto</strong> em relação ao orçamento.
          </p>
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-600 font-semibold">R$ 200 disponível</span>
              <span className="text-gray-500">Budget: R$ 800</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-green-500 rounded-full" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Gasto: R$ 600 (75%)</p>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            ⚠️ A barra fica laranja quando você excede o orçamento!
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 14 (índice 13): Custos Fixos vs Variáveis
    {
      target: '[data-tour="cost-types"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🔧 Fixos vs 🛒 Variáveis</h3>
          <p className="text-gray-600 text-sm mb-2">
            Entenda a diferença:
          </p>
          <div className="space-y-1 text-xs">
            <p><strong className="text-blue-700">🔧 Fixos:</strong> Aluguel, internet (até 50%)</p>
            <p><strong className="text-orange-700">🛒 Variáveis:</strong> Alimentação, transporte (até 30%)</p>
            <p><strong className="text-green-700">📈 Investimentos:</strong> Poupança, ações (20%+)</p>
          </div>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 15 (índice 14): Página de Preferências
    {
      target: '[data-tour="preferences-page"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">⚙️ Preferências</h3>
          <p className="text-gray-600 text-sm">
            Configure como cada categoria de despesa é classificada entre <strong>custos fixos</strong>, <strong>variáveis</strong> ou <strong>investimentos</strong>.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 16 (índice 15): Página de Contas
    {
      target: '[data-tour="accounts-page-content"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🏦 Contas Bancárias</h3>
          <p className="text-gray-600 text-sm">
            Gerencie suas <strong>contas conectadas</strong> via Open Finance. Sincronize, visualize saldos e conecte múltiplos bancos.
          </p>
        </div>
      ),
      placement: 'auto',
    },
    // Passo 17 (índice 16): Conclusão
    {
      target: 'body',
      content: (
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tutorial Concluído!</h2>
          <p className="text-gray-600 text-sm">
            Agora você conhece as principais funcionalidades do Guru do Dindin.
          </p>
          <div className="mt-4 bg-primary-50 rounded-lg p-3 text-left">
            <p className="text-xs font-semibold text-primary-700 mb-2">Próximos passos:</p>
            <ul className="text-xs text-primary-600 space-y-1">
              <li>✅ Conecte sua conta bancária</li>
              <li>✅ Categorize suas transações</li>
              <li>✅ Defina seus orçamentos</li>
              <li>✅ Acompanhe seus gastos diariamente</li>
            </ul>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Você pode reiniciar este tutorial a qualquer momento no menu lateral.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ], []);

  // Ref para acessar pathname atual sem causar re-render
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  // Função para navegar para o step correto
  const goToStep = useCallback((newStepIndex: number) => {
    if (isProcessingRef.current) {
      pendingStepRef.current = newStepIndex;
      return;
    }

    isProcessingRef.current = true;
    setShowTour(false);

    const targetPage = STEP_PAGE_MAP[newStepIndex];
    const currentPath = locationRef.current;
    const needsNavigation = targetPage && currentPath !== targetPage;

    if (needsNavigation) {
      console.log(`🚀 Navigating from ${currentPath} to ${targetPage} for step ${newStepIndex}`);
      navigate(targetPage);
    }

    const delay = needsNavigation ? 1500 : 300;

    setTimeout(() => {
      setStepIndex(newStepIndex);
      setShowTour(true);
      isProcessingRef.current = false;

      if (pendingStepRef.current !== null) {
        const pending = pendingStepRef.current;
        pendingStepRef.current = null;
        goToStep(pending);
      }
    }, delay);
  }, [navigate]);

  // Inicializar o tour quando run muda para true
  useEffect(() => {
    if (run && !showTour && !isProcessingRef.current) {
      console.log('🎬 Starting tour at step', stepIndex);
      setIsFinishing(false); // Resetar flag de finalização
      goToStep(stepIndex);
    }
  }, [run, showTour, stepIndex, goToStep]);

  // Callback do Joyride - ref para evitar stale closures
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;
    const totalSteps = 17; // Número fixo de passos

    console.log('🎯 Joyride callback:', { action, index, status, type, totalSteps });

    // Primeiro: verificar se o status indica término
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('✅ Tutorial completed via status:', status);
      // Marcar como finalizando e chamar onFinish
      setIsFinishing(true);
      setShowTour(false);
      setStepIndex(0);
      onFinishRef.current();
      return;
    }

    // Segundo: verificar se clicou em próximo no último passo
    const isLastStep = index === totalSteps - 1;
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT && isLastStep) {
      console.log('✅ Tutorial completed via last step next action');
      // Marcar como finalizando e chamar onFinish
      setIsFinishing(true);
      setShowTour(false);
      setStepIndex(0);
      onFinishRef.current();
      return;
    }

    // Se tour não está visível, ignorar outros callbacks
    if (!showTour) {
      console.log('🚫 Tour not showing, ignoring callback');
      return;
    }

    // Processar navegação entre steps
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        goToStep(index + 1);
      } else if (action === ACTIONS.PREV && index > 0) {
        goToStep(index - 1);
      }
    }
  }, [showTour, goToStep]);

  // Se não está rodando ou está finalizando, não renderizar nada
  if (!run || isFinishing) {
    return null;
  }

  // Se está navegando entre páginas, mostrar loading
  if (!showTour) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-gray-700">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={true}
      callback={handleJoyrideCallback}
      continuous
      showProgress={false}
      showSkipButton={false}
      disableScrolling={false}
      disableOverlayClose={true}
      spotlightClicks={false}
      scrollToFirstStep={true}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          primaryColor: '#4F46E5',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#374151',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
        },
        spotlight: {
          borderRadius: 12,
          border: '3px solid #4F46E5',
          boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.4), 0 0 30px rgba(79, 70, 229, 0.6)',
        },
        beacon: {
          display: 'none',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default InteractiveTour;
