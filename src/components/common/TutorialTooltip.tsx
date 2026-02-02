import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './DesignSystem';

// Tutorial Context
type TutorialId = 'dashboard-intro' | 'tasks-intro';

interface TutorialContextValue {
  startTutorial: (tutorialId: TutorialId) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  placement: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
  showPrevious?: boolean;
}

interface TutorialTooltipProps {
  steps: TutorialStep[];
  currentStep: number;
  isVisible: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function TutorialTooltip({
  steps,
  currentStep,
  isVisible,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: TutorialTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!step || !isVisible) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement || !tooltipRef.current) return;

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      switch (step.placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 8;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + 8;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + 8;
          break;
      }

      // Keep tooltip in viewport
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
      if (top < 8) top = 8;
      if (top + tooltipRect.height > viewportHeight - 8) {
        top = viewportHeight - tooltipRect.height - 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [step, isVisible]);

  if (!step || !isVisible) return null;

  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50 max-w-sm"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute w-3 h-3 bg-white border-slate-200 transform rotate-45 ${
            step.placement === 'top' ? 'bottom-[-6px] border-b border-r' :
            step.placement === 'bottom' ? 'top-[-6px] border-t border-l' :
            step.placement === 'left' ? 'right-[-6px] border-r border-t' :
            'left-[-6px] border-l border-b'
          }`}
        />

        {/* Tooltip Content */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-slate-900">{step.title}</h3>
            <div className="flex items-center gap-1 ml-4">
              <span className="text-xs text-slate-500">
                {currentStep + 1} of {steps.length}
              </span>
              {step.showSkip !== false && (
                <button
                  onClick={onSkip}
                  className="text-xs text-slate-400 hover:text-slate-600 ml-2"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4">{step.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 0 && step.showPrevious !== false && (
                <Button
                  onClick={onPrevious}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
              )}
            </div>

            <Button
              onClick={isLastStep ? onComplete : onNext}
              size="sm"
            >
              {isLastStep ? 'Got it!' : 'Next'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface TutorialProviderProps {
  children: React.ReactNode;
}

const tutorials: Record<TutorialId, Array<{ id: string; title: string; content: string; target: string; placement: 'top' | 'bottom' | 'left' | 'right'; showSkip?: boolean; showPrevious?: boolean; }>> = {
  'dashboard-intro': [
    {
      id: 'welcome',
      title: 'Welcome to your Dashboard!',
      content: 'This is your command center for tasks and expenses. Let\'s take a quick tour.',
      target: '[data-tutorial="dashboard-title"]',
      placement: 'bottom' as const,
      showSkip: true,
      showPrevious: false,
    },
    {
      id: 'metrics',
      title: 'Key Metrics at a Glance',
      content: 'See your task status, spending trends, and balance overview all in one place.',
      target: '[data-tutorial="dashboard-metrics"]',
      placement: 'bottom' as const,
    },
    {
      id: 'priorities',
      title: 'Today\'s Priorities',
      content: 'Focus on what matters most with your urgent tasks and upcoming deadlines.',
      target: '[data-tutorial="dashboard-priorities"]',
      placement: 'top' as const,
    },
    {
      id: 'spending',
      title: 'Track Your Spending',
      content: 'Monitor your expenses with visual charts and budget tracking.',
      target: '[data-tutorial="dashboard-spending"]',
      placement: 'top' as const,
    },
  ],
  'tasks-intro': [
    {
      id: 'tasks-list',
      title: 'Your Task List',
      content: 'Manage all your tasks here. Use filters to focus on what matters.',
      target: '[data-tutorial="tasks-list"]',
      placement: 'bottom' as const,
    },
    {
      id: 'new-task',
      title: 'Create New Tasks',
      content: 'Click the "New Task" button to add tasks for yourself or roommates.',
      target: '[data-tutorial="new-task-button"]',
      placement: 'bottom' as const,
    },
  ],
};

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [currentTutorial, setCurrentTutorial] = useState<TutorialId | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const startTutorial = useCallback((tutorialId: TutorialId) => {
    setCurrentTutorial(tutorialId);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentTutorial && currentStep < tutorials[currentTutorial].length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setCurrentTutorial(null);
      setCurrentStep(0);
    }
  }, [currentTutorial, currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setCurrentTutorial(null);
    setCurrentStep(0);
  }, []);

  const completeTutorial = useCallback(() => {
    setCurrentTutorial(null);
    setCurrentStep(0);
  }, []);

  const currentSteps = currentTutorial ? tutorials[currentTutorial] : [];
  const isVisible = Boolean(currentTutorial && currentSteps.length > 0);

  const contextValue: TutorialContextValue = { startTutorial };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <TutorialTooltip
        steps={currentSteps}
        currentStep={currentStep}
        isVisible={isVisible}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={skipTutorial}
        onComplete={completeTutorial}
      />
    </TutorialContext.Provider>
  );
}
