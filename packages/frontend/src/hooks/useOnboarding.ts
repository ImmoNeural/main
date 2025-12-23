import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'guru_onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'guru_onboarding_skipped';
const GOALS_COMPLETED_KEY = 'guru_goals_completed';
const HAS_REAL_DATA_KEY = 'guru_has_real_data';

interface UseOnboardingReturn {
  showOnboarding: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  goalsCompleted: boolean;
  hasRealData: boolean;
  shouldShowDemoData: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  completeGoals: () => void;
  markHasRealData: () => void;
}

/**
 * Hook para gerenciar o estado do onboarding/tour
 * Armazena no localStorage se o usuário já completou ou pulou o tour
 */
export const useOnboarding = (): UseOnboardingReturn => {
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  });

  const [isSkipped, setIsSkipped] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
  });

  const [goalsCompleted, setGoalsCompleted] = useState<boolean>(() => {
    return localStorage.getItem(GOALS_COMPLETED_KEY) === 'true';
  });

  const [hasRealData, setHasRealData] = useState<boolean>(() => {
    return localStorage.getItem(HAS_REAL_DATA_KEY) === 'true';
  });

  // Mostrar tutorial apenas se:
  // 1. Goals foram completados
  // 2. Tutorial não foi completado nem pulado
  const showOnboarding = goalsCompleted && !isCompleted && !isSkipped;

  // Mostrar dados demo apenas se:
  // 1. Tutorial está ativo
  // 2. Usuário não tem dados reais importados
  const shouldShowDemoData = showOnboarding && !hasRealData;

  const completeGoals = useCallback(() => {
    localStorage.setItem(GOALS_COMPLETED_KEY, 'true');
    setGoalsCompleted(true);
    console.log('🎯 Goals completed');
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setIsCompleted(true);
    setIsSkipped(false);
    console.log('✅ Onboarding completed');
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setIsSkipped(true);
    console.log('⏭️ Onboarding skipped');
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    // Note: Não removemos GOALS_COMPLETED_KEY nem HAS_REAL_DATA_KEY
    // para que o usuário vá direto ao tutorial quando clicar em "Tutorial" no menu
    setIsCompleted(false);
    setIsSkipped(false);
    // Resetar goalsCompleted para permitir tutorial
    localStorage.setItem(GOALS_COMPLETED_KEY, 'true');
    setGoalsCompleted(true);
    console.log('🔄 Onboarding reset');
  }, []);

  const markHasRealData = useCallback(() => {
    localStorage.setItem(HAS_REAL_DATA_KEY, 'true');
    setHasRealData(true);
    console.log('📊 User has real data now');
  }, []);

  return {
    showOnboarding,
    isCompleted,
    isSkipped,
    goalsCompleted,
    hasRealData,
    shouldShowDemoData,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    completeGoals,
    markHasRealData,
  };
};

export default useOnboarding;
