import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'guru_onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'guru_onboarding_skipped';

interface UseOnboardingReturn {
  showOnboarding: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
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

  // Mostrar onboarding se não foi completado nem pulado
  const showOnboarding = !isCompleted && !isSkipped;

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
    setIsCompleted(false);
    setIsSkipped(false);
    console.log('🔄 Onboarding reset');
  }, []);

  return {
    showOnboarding,
    isCompleted,
    isSkipped,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
};

export default useOnboarding;
