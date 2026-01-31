import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useGroups } from './GroupContext';

export type OnboardingStep =
  | 'welcome'
  | 'personal-group'
  | 'household-decision'
  | 'invite-roommates'
  | 'create-first-task'
  | 'complete';

type OnboardingContextValue = {
  currentStep: OnboardingStep;
  isOnboardingComplete: boolean;
  isOnboardingActive: boolean;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = 'divvydo.onboarding';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { groups, activeGroup } = useGroups();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored === 'completed') {
      setIsOnboardingComplete(true);
      return;
    }

    // Determine current step based on user state
    if (groups.length === 0) {
      setCurrentStep('welcome');
    } else if (groups.some(g => g.type === 'personal')) {
      const personalGroup = groups.find(g => g.type === 'personal');
      const householdGroups = groups.filter(g => g.type === 'household');

      if (householdGroups.length === 0) {
        setCurrentStep('household-decision');
      } else if (personalGroup && activeGroup?.id === personalGroup.id) {
        setCurrentStep('create-first-task');
      } else {
        // User is in a household group, check if they have created tasks
        // For now, assume onboarding is complete if they have household groups
        setIsOnboardingComplete(true);
      }
    }
  }, [user, groups, activeGroup]);

  const nextStep = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'personal-group',
      'household-decision',
      'invite-roommates',
      'create-first-task',
      'complete'
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'personal-group',
      'household-decision',
      'invite-roommates',
      'create-first-task',
      'complete'
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const skipOnboarding = () => {
    setIsOnboardingComplete(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'skipped');
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    setCurrentStep('complete');
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'completed');
  };

  const resetOnboarding = () => {
    setIsOnboardingComplete(false);
    setCurrentStep('welcome');
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  const isOnboardingActive = !isOnboardingComplete && user !== null;

  const value = {
    currentStep,
    isOnboardingComplete,
    isOnboardingActive,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
