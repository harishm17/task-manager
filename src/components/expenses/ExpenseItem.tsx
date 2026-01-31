import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Avatar, Button, cn } from '../common/DesignSystem';
import type { Expense } from '../../lib/api/expenses';
import { fetchExpenseSplits } from '../../lib/api/expenses';
import { hasSupabaseEnv } from '../../lib/supabaseClient';
import { useCurrencyFormatter } from '../../lib/formatters';

type ExpenseItemProps = {
    expense: Expense;
    currency: string;
    currentUserId?: string;
    peopleById: Map<string, string>;
    onEdit: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
};

function ExpenseDetails({ expenseId, currency }: { expenseId: string; currency: string }) {
    const {
        data: splits = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['expense-splits', expenseId],
        queryFn: () => fetchExpenseSplits(expenseId),
        enabled: Boolean(expenseId && hasSupabaseEnv),
    });

    const formatter = useCurrencyFormatter(currency);

    if (isLoading) return <p className="text-xs text-slate-500 py-2">Loading splits...</p>;
    if (error) return <p className="text-xs text-rose-600 py-2">Failed to load splits.</p>;
    if (splits.length === 0) return <p className="text-xs text-slate-500 py-2">No splits recorded.</p>;

    return (
        <ul className="space-y-1.5 text-xs text-slate-600">
            {splits.map((split) => (
                <li key={split.person_id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <Avatar name={split.person?.display_name ?? '?'} size="sm" className="h-4 w-4 text-[9px]" />
                        {split.person?.display_name ?? 'Unknown'}
                    </span>
                    <span className="font-medium text-slate-900">{formatter.format(split.amount_owed_cents / 100)}</span>
                </li>
            ))}
        </ul>
    );
}

export const ExpenseItem = memo(function ExpenseItem({
    expense,
    currency,
    currentUserId: _currentUserId, // Reserved for future use
    peopleById,
    onEdit,
    onDelete,
    isExpanded,
    onToggleExpand,
}: ExpenseItemProps) {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwipeActive, setIsSwipeActive] = useState(false);

    const formatter = useCurrencyFormatter(currency);

    const amountFormatted = formatter.format(expense.amount_cents / 100);
    const payerName = peopleById.get(expense.paid_by_person_id) ?? 'Unknown';

    const date = new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const swipeHandlers = useSwipeable({
        onSwiping: (eventData) => {
            // Only allow horizontal swiping
            if (Math.abs(eventData.deltaX) > Math.abs(eventData.deltaY)) {
                setSwipeOffset(eventData.deltaX);
                setIsSwipeActive(true);
            }
        },
        onSwiped: (eventData) => {
            const threshold = 80; // Minimum swipe distance to trigger action

            if (eventData.deltaX < -threshold) {
                // Swipe left to delete
                onDelete(expense.id);
            }

            setSwipeOffset(0);
            setIsSwipeActive(false);
        },
        onSwipedLeft: () => {
            setSwipeOffset(0);
            setIsSwipeActive(false);
        },
        onSwipedRight: () => {
            setSwipeOffset(0);
            setIsSwipeActive(false);
        },
        preventScrollOnSwipe: true,
        trackMouse: false, // Only enable on touch devices
    });

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                x: isSwipeActive ? swipeOffset : 0
            }}
            exit={{ opacity: 0 }}
            transition={{
                x: { type: "spring", stiffness: 300, damping: 30 }
            }}
            className="group overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all hover:border-slate-200 hover:shadow-sm"
            {...swipeHandlers}
        >
            {/* Swipe Action Backgrounds */}
            <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 text-white">
                <div className={cn(
                    'rounded-full bg-red-500 p-2 opacity-0 transition-opacity',
                    swipeOffset < -40 && 'opacity-100'
                )}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </div>
            </div>

            <div
                className="flex cursor-pointer items-center gap-4 p-4"
                onClick={onToggleExpand}
            >
                {/* Date Box */}
                <div className="flex bg-slate-50 flex-col items-center justify-center rounded-xl border border-slate-100 p-2 text-center h-12 w-12 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{date.split(' ')[0]}</span>
                    <span className="text-sm font-bold text-slate-900">{date.split(' ')[1]}</span>
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="truncate font-semibold text-slate-900">{expense.description}</h4>
                        {expense.category && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {expense.category.icon} {expense.category.name}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{payerName}</span> paid {amountFormatted}
                    </p>
                </div>

                {/* Amount / Arrow */}
                <div className="text-right">
                    <div className="font-bold text-slate-900">{amountFormatted}</div>
                    <div className="text-[10px] text-slate-400">
                        {isExpanded ? 'Hide details' : 'Show details'}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-50 bg-slate-50/30"
                    >
                        <div className="p-4 pt-2">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Splits</p>
                            <ExpenseDetails expenseId={expense.id} currency={currency} />

                            {expense.notes && (
                                <div className="mt-3 rounded-lg border border-slate-100 bg-white p-2">
                                    <p className="text-xs text-slate-500 italic">"{expense.notes}"</p>
                                </div>
                            )}

                            <div className="mt-4 flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                                >
                                    Edit Expense
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Delete this expense?')) onDelete(expense.id);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
