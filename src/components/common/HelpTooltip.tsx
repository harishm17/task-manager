import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './DesignSystem';

interface HelpTooltipProps {
  title: string;
  content: string;
  children?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ title, content, children, side = 'top' }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sideClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        className="w-5 h-5 p-0 text-slate-400 hover:text-slate-600"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <path d="M12 17h.01"></path>
        </svg>
      </Button>

      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsVisible(false)}
            />

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute z-50 ${sideClasses[side]} w-64`}
            >
              <div className="bg-slate-800 text-white rounded-lg p-4 shadow-lg">
                <h4 className="font-semibold text-sm mb-2">{title}</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{content}</p>
                {children && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    {children}
                  </div>
                )}

                {/* Arrow */}
                <div className={`absolute w-0 h-0 border-4 ${arrowClasses[side]}`} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Contextual help components for specific features
export function TaskSplittingHelp() {
  return (
    <HelpTooltip
      title="Task Assignment"
      content="Assign tasks to specific roommates or leave them unassigned. Assigned tasks will show up in their personal task list."
      side="right"
    >
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span>Assigned to you</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
          <span>Unassigned</span>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function ExpenseSplittingHelp() {
  return (
    <HelpTooltip
      title="Expense Splitting Methods"
      content="Choose how to split expenses among your roommates. Equal splits everyone equally, while custom methods let you specify exact amounts or percentages."
      side="right"
    >
      <div className="space-y-1 text-xs">
        <div><strong>Equal:</strong> Automatic fair split</div>
        <div><strong>Exact:</strong> Specify who pays what</div>
        <div><strong>Percentage:</strong> Split by custom ratios</div>
        <div><strong>Adjustment:</strong> Reimbursements</div>
      </div>
    </HelpTooltip>
  );
}

export function RecurringHelp() {
  return (
    <HelpTooltip
      title="Recurring Items"
      content="Set up tasks and expenses that repeat automatically. Perfect for weekly chores, monthly bills, or regular shopping trips."
      side="top"
    >
      <div className="space-y-1 text-xs">
        <div>🔄 <strong>Auto-generated:</strong> Items appear automatically</div>
        <div>📅 <strong>Flexible:</strong> Daily, weekly, or monthly</div>
        <div>⏰ <strong>On time:</strong> Never forget recurring tasks</div>
      </div>
    </HelpTooltip>
  );
}

export function BalanceHelp() {
  return (
    <HelpTooltip
      title="Understanding Balances"
      content="See who owes money and who is owed. Positive balances mean you're owed money, negative means you owe others."
      side="left"
    >
      <div className="space-y-1 text-xs">
        <div>💚 <strong>You're owed:</strong> Others pay you</div>
        <div>❤️ <strong>You owe:</strong> You need to pay others</div>
        <div>⚖️ <strong>Settled:</strong> All square</div>
      </div>
    </HelpTooltip>
  );
}
