import { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';

// Custom tooltip component with Portuguese step counter
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
    className="bg-white rounded-2xl shadow-2xl max-w-md"
    style={{ padding: 20, borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
  >
    {step.content}
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2">
        {index > 0 && (
          <button
            {...backProps}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Anterior
          </button>
        )}
      </div>
      <div className="text-xs text-gray-400">
        Passo {index + 1} de {size}
      </div>
      <div className="flex items-center gap-2">
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

const InteractiveTour = ({ run, onFinish }: InteractiveTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Definição dos passos do tutorial (15 passos)
  const steps: Step[] = [
    // === DASHBOARD (Passos 1-5) ===
    // Passo 1: Boas-vindas
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
    // Passo 2: Cards de resumo
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
    // Passo 3: Seletor de período
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
    // Passo 4: Gráfico de barras mensal
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
    // Passo 5: Botão de conectar banco
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

    // === TRANSAÇÕES (Passos 6-9) ===
    // Passo 6: Página de transações
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
      placement: 'bottom',
    },
    // Passo 7: Filtros de transações
    {
      target: '[data-tour="transactions-filters"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🔍 Filtros Avançados</h3>
          <p className="text-gray-600 text-sm">
            Use os filtros para encontrar transações específicas:
          </p>
          <ul className="text-xs text-gray-500 mt-2 space-y-1">
            <li>• <strong>Busca:</strong> Pesquise por descrição ou merchant</li>
            <li>• <strong>Categoria:</strong> Filtre por categoria</li>
            <li>• <strong>Tipo de Custo:</strong> Fixos, Variáveis ou Investimentos</li>
          </ul>
        </div>
      ),
      placement: 'left',
    },
    // Passo 8: Botão de categorizar
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
      placement: 'bottom',
    },
    // Passo 9: Categorização manual
    {
      target: '[data-tour="category-dropdown"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🏷️ Categorização Manual</h3>
          <p className="text-gray-600 text-sm">
            Você também pode <strong>alterar a categoria manualmente</strong> clicando no dropdown.
          </p>
          <p className="text-xs text-primary-600 mt-2 font-medium">
            💡 Ao mudar uma categoria, o sistema sugere aplicar a mesma mudança em transações similares!
          </p>
        </div>
      ),
      placement: 'left',
    },

    // === ORÇAMENTOS (Passos 10-13) ===
    // Passo 10: Página de orçamentos
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
      placement: 'bottom',
    },
    // Passo 11: Resumo financeiro (com scroll desabilitado para foco na janela)
    {
      target: '[data-tour="financial-summary"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">📊 Resumo Financeiro</h3>
          <p className="text-gray-600 text-sm">
            Veja seu <strong>salário</strong>, quanto está gastando em <strong>custos fixos</strong>,
            <strong> variáveis</strong> e <strong>investimentos</strong>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            O gráfico compara seu orçamento planejado com o gasto real.
          </p>
          <p className="text-xs text-primary-600 mt-2 font-medium">
            💡 Role a página para ver mais detalhes dos orçamentos!
          </p>
        </div>
      ),
      placement: 'bottom',
      disableScrolling: true,
    },
    // Passo 12: Cards de budget
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
      placement: 'top',
      disableScrolling: true,
    },
    // Passo 13: Custos Fixos vs Variáveis
    {
      target: '[data-tour="cost-types"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">🔧 Fixos vs 🛒 Variáveis</h3>
          <p className="text-gray-600 text-sm">
            Entenda a diferença e mantenha sua saúde financeira:
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <strong className="text-blue-700">🔧 Custos Fixos:</strong>
              <span className="text-gray-600"> Aluguel, internet, streaming, seguros</span>
              <p className="text-blue-600 mt-1">Ideal: até 50% do salário</p>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <strong className="text-orange-700">🛒 Custos Variáveis:</strong>
              <span className="text-gray-600"> Alimentação, transporte, compras</span>
              <p className="text-orange-600 mt-1">Ideal: até 30% do salário</p>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <strong className="text-green-700">📈 Investimentos:</strong>
              <span className="text-gray-600"> Poupança, ações, fundos</span>
              <p className="text-green-600 mt-1">Meta: pelo menos 20% do salário</p>
            </div>
          </div>
        </div>
      ),
      placement: 'top',
      disableScrolling: true,
    },

    // === PREFERÊNCIAS E RADAR (Passos 14-15) ===
    // Passo 14: Página de Preferências
    {
      target: '[data-tour="preferences-page"]',
      content: (
        <div>
          <h3 className="font-bold text-gray-900 mb-2">⚙️ Preferências</h3>
          <p className="text-gray-600 text-sm">
            Configure como cada categoria de despesa é classificada:
          </p>
          <ul className="text-xs text-gray-500 mt-2 space-y-1">
            <li>• <strong>Custo Fixo:</strong> Despesas recorrentes (aluguel, assinaturas)</li>
            <li>• <strong>Custo Variável:</strong> Despesas que variam (alimentação, lazer)</li>
            <li>• <strong>Investimento:</strong> Aplicações financeiras</li>
          </ul>
          <p className="text-xs text-primary-600 mt-2 font-medium">
            💡 Isso ajuda a organizar melhor seus orçamentos e relatórios!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    // Passo 15: Gráfico Radar (voltando ao Dashboard)
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
      placement: 'left',
    },
    // Passo 16: Conclusão
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
  ];

  // Mapeamento de qual página cada step deve estar (índice do passo -> página)
  const stepPageMap: Record<number, string> = {
    // Dashboard (Passos 1-5: índices 0-4)
    0: '/app/dashboard',
    1: '/app/dashboard',
    2: '/app/dashboard',
    3: '/app/dashboard',
    4: '/app/dashboard',
    // Transações (Passos 6-9: índices 5-8)
    5: '/app/transactions',
    6: '/app/transactions',
    7: '/app/transactions',
    8: '/app/transactions',
    // Orçamentos (Passos 10-13: índices 9-12)
    9: '/app/budgets',
    10: '/app/budgets',
    11: '/app/budgets',
    12: '/app/budgets',
    // Preferências (Passo 14: índice 13)
    13: '/app/preferences',
    // Dashboard - Radar Chart (Passo 15: índice 14)
    14: '/app/dashboard',
    // Conclusão (Passo 16: índice 15)
    15: '/app/dashboard',
  };

  // Navegar para a página correta quando o step mudar
  useEffect(() => {
    if (run && stepIndex >= 0) {
      const targetPage = stepPageMap[stepIndex];
      if (targetPage && location.pathname !== targetPage) {
        navigate(targetPage);
        // Aguardar a página carregar e os dados demo serem aplicados
        setIsReady(false);
        setTimeout(() => setIsReady(true), 800);
      } else {
        // Mesmo na mesma página, dar um pequeno delay para garantir que elementos existam
        setIsReady(false);
        setTimeout(() => setIsReady(true), 100);
      }
    }
  }, [stepIndex, run, navigate, location.pathname]);

  // Callback do Joyride
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    // Log para debug
    console.log('🎯 Tour callback:', { action, index, status, type });

    // Só avançar/voltar no evento STEP_AFTER (não em TARGET_NOT_FOUND)
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Finalizar tour
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      onFinish();
    }
  }, [onFinish]);

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={run && isReady}
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
          overlayColor: 'rgba(0, 0, 0, 0.6)',
        },
        spotlight: {
          borderRadius: 12,
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
