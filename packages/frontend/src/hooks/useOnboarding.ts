import { useState, useCallback, useEffect } from 'react';

const ONBOARDING_KEY = 'guru_onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'guru_onboarding_skipped';
const GOALS_COMPLETED_KEY = 'guru_goals_completed';
const HAS_REAL_DATA_KEY = 'guru_has_real_data';

// Custom event name for cross-component communication
const ONBOARDING_STATE_CHANGE_EVENT = 'guru_onboarding_state_change';

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

// Helper to dispatch state change event
const dispatchStateChange = () => {
  window.dispatchEvent(new CustomEvent(ONBOARDING_STATE_CHANGE_EVENT));
};

/**
 * Hook para gerenciar o estado do onboarding/tour
 * Armazena no localStorage se o usuário já completou ou pulou o tour
 * Uses custom events to sync state across all components using this hook
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

  // Listen for state changes from other components
  useEffect(() => {
    const handleStateChange = () => {
      // Re-read all values from localStorage
      setIsCompleted(localStorage.getItem(ONBOARDING_KEY) === 'true');
      setIsSkipped(localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true');
      setGoalsCompleted(localStorage.getItem(GOALS_COMPLETED_KEY) === 'true');
      setHasRealData(localStorage.getItem(HAS_REAL_DATA_KEY) === 'true');
    };

    window.addEventListener(ONBOARDING_STATE_CHANGE_EVENT, handleStateChange);
    return () => {
      window.removeEventListener(ONBOARDING_STATE_CHANGE_EVENT, handleStateChange);
    };
  }, []);

  // Mostrar tutorial apenas se:
  // 1. Goals foram completados
  // 2. Tutorial não foi completado nem pulado
  const showOnboarding = goalsCompleted && !isCompleted && !isSkipped;

  // Mostrar dados demo SEMPRE durante o tutorial
  // Isso garante uma experiência consistente para todos os usuários
  // independente de terem dados reais ou não
  const shouldShowDemoData = showOnboarding;

  const completeGoals = useCallback(() => {
    localStorage.setItem(GOALS_COMPLETED_KEY, 'true');
    setGoalsCompleted(true);
    console.log('🎯 Goals completed');
    dispatchStateChange();
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setIsCompleted(true);
    setIsSkipped(false);
    console.log('✅ Onboarding completed - dispatching state change');
    dispatchStateChange();
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setIsSkipped(true);
    console.log('⏭️ Onboarding skipped');
    dispatchStateChange();
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
    dispatchStateChange();
  }, []);

  const markHasRealData = useCallback(() => {
    localStorage.setItem(HAS_REAL_DATA_KEY, 'true');
    setHasRealData(true);
    console.log('📊 User has real data now');
    dispatchStateChange();
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
