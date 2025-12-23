import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'guru_onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'guru_onboarding_skipped';
const GOALS_COMPLETED_KEY = 'guru_goals_completed';

interface UseOnboardingReturn {
  showOnboarding: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  goalsCompleted: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  completeGoals: () => void;
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

  // Mostrar tutorial apenas se:
  // 1. Goals foram completados
  // 2. Tutorial não foi completado nem pulado
  const showOnboarding = goalsCompleted && !isCompleted && !isSkipped;

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
    localStorage.removeItem(GOALS_COMPLETED_KEY);
    setIsCompleted(false);
    setIsSkipped(false);
    setGoalsCompleted(false);
    console.log('🔄 Onboarding reset');
  }, []);

  return {
    showOnboarding,
    isCompleted,
    isSkipped,
    goalsCompleted,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    completeGoals,
  };
};

export default useOnboarding;
