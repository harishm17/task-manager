import { useOnboarding } from '../../contexts/OnboardingContext';
import { WelcomeModal } from './WelcomeModal';

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { isOnboardingActive } = useOnboarding();

  return (
    <>
      {children}
      {isOnboardingActive && <WelcomeModal />}
    </>
  );
}
