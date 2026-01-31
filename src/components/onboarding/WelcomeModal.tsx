import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useGroups } from '../../contexts/GroupContext';
import { Button } from '../common/DesignSystem';
import { showSuccess } from '../common/ToastProvider';

export function WelcomeModal() {
  const { currentStep, nextStep, previousStep, skipOnboarding } = useOnboarding();
  const { createHouseholdGroup } = useGroups();
  const navigate = useNavigate();

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  const handleCreateHouseholdGroup = async () => {
    if (!groupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      const result = await createHouseholdGroup(groupName.trim());
      if (result.error) {
        console.error('Failed to create group:', result.error);
      } else {
        showSuccess('Household group created successfully!');
        nextStep();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const getProgressPercentage = () => {
    const steps = ['welcome', 'personal-group', 'household-decision', 'invite-roommates', 'create-first-task', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl">🏠</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome to DivvyDo!
              </h1>
              <p className="text-slate-600 mb-6">
                Manage tasks and split expenses with your roommates — all in one place.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 text-left">
                <div className="text-2xl">✅</div>
                <div>
                  <div className="font-medium text-slate-900">Track household tasks</div>
                  <div className="text-sm text-slate-600">Assign chores and stay organized</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="text-2xl">💰</div>
                <div>
                  <div className="font-medium text-slate-900">Split bills fairly</div>
                  <div className="text-sm text-slate-600">Automatic expense splitting</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="text-2xl">⚖️</div>
                <div>
                  <div className="font-medium text-slate-900">See who owes what</div>
                  <div className="text-sm text-slate-600">Real-time balance tracking</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={skipOnboarding} variant="ghost">
                Skip for now
              </Button>
              <Button onClick={nextStep}>
                Get Started
              </Button>
            </div>
          </div>
        );

      case 'personal-group':
        return (
          <div className="text-center space-y-6">
            <div className="text-4xl">✨</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Let's start with your personal workspace
              </h1>
              <p className="text-slate-600">
                We've created "My Tasks" for you. This is your private space for personal todos.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📝</div>
                <div className="text-left">
                  <div className="font-medium text-blue-900">My Tasks</div>
                  <div className="text-sm text-blue-700">Your personal task list</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={nextStep}>
                Continue
              </Button>
            </div>
          </div>
        );

      case 'household-decision':
        return (
          <div className="text-center space-y-6">
            <div className="text-4xl">🏠</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Do you live with roommates?
              </h1>
              <p className="text-slate-600">
                Create a household group to assign chores, split bills, and track who owes what.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={nextStep}
                className="w-full"
                size="lg"
              >
                Yes, create a household group
              </Button>
              <Button
                onClick={() => {
                  skipOnboarding();
                  navigate('/dashboard');
                }}
                variant="outline"
                className="w-full"
              >
                Not right now
              </Button>
            </div>
          </div>
        );

      case 'invite-roommates':
        return (
          <div className="text-center space-y-6">
            <div className="text-4xl">🚀</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Add your roommates
              </h1>
              <p className="text-slate-600 mb-4">
                Invite them by email or share a link. Don't worry, you can add people later too!
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="text-left">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., The Awesome Apartment"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={previousStep}
                variant="ghost"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateHouseholdGroup}
                disabled={!groupName.trim() || isCreatingGroup}
              >
                {isCreatingGroup ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
        );

      case 'create-first-task':
        return (
          <div className="text-center space-y-6">
            <div className="text-4xl">📝</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Let's create your first task!
              </h1>
              <p className="text-slate-600">
                Try creating a task like "Take out trash" or "Buy groceries".
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">👆</div>
                <div>
                  <div className="font-medium text-blue-900">Click "New Task"</div>
                  <div className="text-sm text-blue-700">in the top-right corner</div>
                </div>
              </div>
              <div className="text-sm text-blue-700">
                Try: "Take out trash", "Buy groceries", or "Clean kitchen"
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={previousStep}
                variant="ghost"
              >
                Back
              </Button>
              <Link to="/tasks">
                <Button>
                  Go to Tasks →
                </Button>
              </Link>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="text-5xl">🎉</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                You're all set!
              </h1>
              <p className="text-slate-600 mb-4">
                Here's what you can do next:
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="text-green-600">✓</div>
                <div className="text-green-900">Create tasks and assign roommates</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-green-600">💰</div>
                <div className="text-green-900">Add expenses and split costs</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-green-600">⚖️</div>
                <div className="text-green-900">Check balances to see who owes</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-green-600">🔁</div>
                <div className="text-green-900">Set up recurring tasks & bills</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link to="/dashboard">
                <Button>
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>🎓 <Link to="#" className="underline hover:text-slate-700">Watch quick tutorials</Link></div>
              <div>📖 <Link to="#" className="underline hover:text-slate-700">Read help docs</Link></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            skipOnboarding();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
        >
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">
                Step {['welcome', 'personal-group', 'household-decision', 'invite-roommates', 'create-first-task', 'complete'].indexOf(currentStep) + 1} of 6
              </span>
              <button
                onClick={skipOnboarding}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Skip
              </button>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {renderStep()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
