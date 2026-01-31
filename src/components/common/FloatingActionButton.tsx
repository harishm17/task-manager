import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './DesignSystem';

interface FABAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
}

export function FloatingActionButton({ actions }: FloatingActionButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Default actions based on current route
  const getDefaultActions = (): FABAction[] => {
    const currentPath = location.pathname;

    if (currentPath === '/tasks') {
      return [
        {
          id: 'new-task',
          label: 'New Task',
          icon: '✓',
          onClick: () => {
            // This will be handled by the TaskList component
            const event = new CustomEvent('fab-new-task');
            window.dispatchEvent(event);
            setIsOpen(false);
          },
          color: 'bg-blue-500 hover:bg-blue-600',
        },
      ];
    }

    if (currentPath === '/expenses') {
      return [
        {
          id: 'new-expense',
          label: 'Add Expense',
          icon: '💰',
          onClick: () => {
            // This will be handled by the ExpenseList component
            const event = new CustomEvent('fab-new-expense');
            window.dispatchEvent(event);
            setIsOpen(false);
          },
          color: 'bg-green-500 hover:bg-green-600',
        },
      ];
    }

    if (currentPath === '/balances') {
      return [
        {
          id: 'settle-up',
          label: 'Settle Up',
          icon: '💸',
          onClick: () => {
            // This will be handled by the BalancesPanel component
            const event = new CustomEvent('fab-settle-up');
            window.dispatchEvent(event);
            setIsOpen(false);
          },
          color: 'bg-purple-500 hover:bg-purple-600',
        },
      ];
    }

    // Default actions for other pages
    return [
      {
        id: 'new-task',
        label: 'New Task',
        icon: '✓',
        onClick: () => navigate('/tasks'),
        color: 'bg-blue-500 hover:bg-blue-600',
      },
      {
        id: 'new-expense',
        label: 'Add Expense',
        icon: '💰',
        onClick: () => navigate('/expenses'),
        color: 'bg-green-500 hover:bg-green-600',
      },
      {
        id: 'search',
        label: 'Search',
        icon: '🔍',
        onClick: () => {
          const event = new CustomEvent('fab-search');
          window.dispatchEvent(event);
          setIsOpen(false);
        },
        color: 'bg-slate-500 hover:bg-slate-600',
      },
    ];
  };

  const currentActions = actions || getDefaultActions();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop for closing menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* FAB Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end space-y-2 md:hidden">
            {currentActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                className="flex items-center"
              >
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="bg-slate-900 text-white text-sm px-3 py-2 rounded-lg mr-2 whitespace-nowrap shadow-lg"
                >
                  {action.label}
                </motion.div>
                <Button
                  onClick={action.onClick}
                  className={`w-12 h-12 rounded-full shadow-lg ${action.color || 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center justify-center text-lg`}
                  size="icon"
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.div
        className="fixed bottom-4 right-4 z-50 md:hidden"
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Button
          onClick={toggleMenu}
          className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg flex items-center justify-center text-2xl text-white"
          size="icon"
        >
          {isOpen ? '✕' : '+'}
        </Button>
      </motion.div>
    </>
  );
}
