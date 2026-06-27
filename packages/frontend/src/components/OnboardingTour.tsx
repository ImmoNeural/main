import { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  image?: string; // Caminho para imagem
  imageSize?: 'small' | 'medium' | 'large'; // Tamanho da imagem
  tips?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Guru do Dindin!',
    description: 'Vamos te guiar pelos primeiros passos para você ter controle total das suas finanças. Este tour leva menos de 2 minutos.',
    icon: <Wallet className="w-12 h-12 text-primary-500" />,
    tips: [
      'Importe suas transações via CSV do seu banco',
      'Veja todas as transações em um só lugar',
      'Categorize e analise seus gastos',
    ],
  },
  {
    id: 'import-transactions',
    title: '1. Importe suas Transações',
    description: 'O primeiro passo é importar suas transações. Baixe o extrato do seu banco em CSV e importe no Guru do Dindin para começar.',
    image: '/bancos.png',
    tips: [
      'Vá em "Transações" no menu lateral',
      'Clique em "Importar Transações"',
      'Selecione o arquivo CSV do seu extrato bancário',
      'Suas transações serão categorizadas automaticamente',
    ],
  },
  {
    id: 'accounts',
    title: '2. Página de Contas',
    description: 'Na página de Contas você pode gerenciar todas as suas contas conectadas, ver saldos atualizados e sincronizar transações.',
    image: '/bancos_arq.png',
    tips: [
      'Clique em "Sincronizar" para atualizar transações',
      'Use "Usar no Dashboard" para selecionar a conta ativa',
      'O saldo é atualizado via Open Finance',
      'Limite de crédito/cheque especial aparece quando disponível',
    ],
  },
  {
    id: 'transactions',
    title: '3. Página de Transações',
    description: 'Aqui você vê todas as transações da conta selecionada. Pode filtrar por período, categoria e tipo (receita/despesa).',
    image: '/Categorizacao de despezas.png',
    tips: [
      'Use os filtros para encontrar transações específicas',
      'Clique na categoria para alterar manualmente',
      'Use "Categorizar" para categorização automática com IA',
      'Exporte para CSV quando precisar',
    ],
  },
  {
    id: 'categorize',
    title: '4. Categorize suas Transações',
    description: 'A categorização ajuda você a entender para onde vai seu dinheiro. Use a IA para categorizar automaticamente ou faça manualmente.',
    image: '/Categorizacao de despezas.png',
    tips: [
      'Clique em "Categorizar" para usar IA',
      'A IA aprende com suas escolhas ao longo do tempo',
      'Transações em cinza ainda não foram categorizadas',
      'Ao categorizar uma, transações similares são sugeridas',
    ],
  },
  {
    id: 'dashboard',
    title: '5. Dashboard - Visão Geral',
    description: 'O Dashboard mostra um resumo completo das suas finanças: saldo, receitas, despesas e gráficos de evolução.',
    image: '/marketing.png',
    imageSize: 'small',
    tips: [
      'Veja o saldo atual da conta selecionada',
      'Acompanhe receitas vs despesas',
      'Gráficos mostram evolução ao longo do tempo',
      'Cards mostram comparativo com mês anterior',
    ],
  },
  {
    id: 'budget',
    title: '6. Orçamentos (Opcional)',
    description: 'Defina limites de gastos por categoria para controlar melhor suas finanças e receber alertas.',
    image: '/Budget.png',
    tips: [
      'Acesse "Orçamentos" no menu',
      'Defina quanto quer gastar por categoria',
      'Acompanhe o progresso durante o mês',
      'Separe gastos fixos de variáveis',
    ],
  },
  {
    id: 'plans',
    title: '7. Planos e Assinatura',
    description: 'Você tem 7 dias grátis para testar todas as funcionalidades. Depois, escolha o plano que melhor se adapta às suas necessidades.',
    image: '/Planos.png',
    tips: [
      'Manual (R$ 13,90/mês): Importação manual de transações',
      'Conectado (R$ 29,90/mês): Open Finance + 2 contas',
      'Conectado Plus (R$ 41,90/mês): IA + 4 contas',
      'Todos os planos são anuais com desconto',
    ],
  },
  {
    id: 'done',
    title: 'Pronto para Começar!',
    description: 'Você está pronto para usar o Guru do Dindin. Comece conectando sua primeira conta bancária.',
    icon: <CheckCircle className="w-12 h-12 text-green-500" />,
    tips: [
      'Conecte sua conta bancária agora',
      'O tour pode ser reiniciado nas Configurações',
      'Dúvidas? Acesse nossa central de ajuda',
    ],
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 sticky top-0">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          title="Pular tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-2">
            <span className="text-xs text-gray-400 font-medium">
              {currentStep + 1} de {ONBOARDING_STEPS.length}
            </span>
          </div>

          {/* Image or Icon */}
          <div className="flex justify-center mb-6">
            {step.image ? (
              <div className={`rounded-xl overflow-hidden shadow-lg border border-gray-200 ${
                step.imageSize === 'small' ? 'max-w-[200px]' : 'w-full max-w-sm'
              }`}>
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : step.icon ? (
              <div className="p-4 bg-gray-50 rounded-full">
                {step.icon}
              </div>
            ) : null}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <ul className="space-y-2">
                {step.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <ArrowRight className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-6 bg-primary-500'
                    : index < currentStep
                      ? 'bg-primary-300'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                isFirstStep
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Pular
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all"
            >
              <span>{isLastStep ? 'Começar!' : 'Próximo'}</span>
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
