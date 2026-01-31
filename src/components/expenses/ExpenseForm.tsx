import { useState, useEffect, useRef } from 'react';
import { Button, Input, Select, cn } from '../common/DesignSystem';
import { ExpenseSplittingHelp, RecurringHelp } from '../common/HelpTooltip';
import type { ExpenseCategory } from '../../lib/api/expenses';
import {
    calculateEqualSplits,
    type SplitMethod
} from '../../lib/api/expenses';
import type { RecurringFrequency } from '../../lib/recurring';
import { getTodayDateString } from '../../lib/recurring';
import { getCurrencyFormatter } from '../../lib/formatters';

// Define the expense form data structure
export interface ExpenseFormData {
    mode: 'single' | 'recurring';
    description: string;
    amount: string;
    expenseDate: string;
    categoryId: string | null;
    paidByPersonId: string;
    splitMethod: SplitMethod;
    participantIds: string[];
    customSplits: Record<string, string>;
    adjustmentFromPersonId?: string;
    notes?: string;
    isRecurring?: boolean;
    frequency?: RecurringFrequency;
    interval?: string;
    endDate?: string;
    receiptFile?: File | null;
}

// Define initial data structure for editing
export interface ExpenseInitialData {
    description?: string;
    amount_cents?: number;
    expense_date?: string;
    category_id?: string;
    paid_by_person_id?: string;
    split_method?: string; // Using string since Expense type uses string
    participant_ids?: string[];
    custom_splits?: Record<string, number>;
    adjustment_from_person_id?: string;
    notes?: string;
}

type ExpenseFormProps = {
    people: Array<{ id: string; display_name: string }>;
    categories: ExpenseCategory[];
    currency: string;
    onSubmit: (data: ExpenseFormData) => void;
    onCancel: () => void;
    initialData?: ExpenseInitialData;
    mode?: 'create' | 'edit';
    isSubmitting?: boolean;
    error?: string | null;
};

// Helper constants and functions inside component or outside
const calculateEqualPercentages = (personIds: string[]) => {
    if (personIds.length === 0) return [];
    const totalBasisPoints = 10000;
    const base = Math.floor(totalBasisPoints / personIds.length);
    let remainder = totalBasisPoints - base * personIds.length;

    return personIds.map((personId) => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        return { personId, percentage: (base + extra) / 100 };
    });
};

export function ExpenseForm({
    people,
    categories,
    currency,
    onSubmit,
    onCancel,
    initialData,
    mode = 'create',
    isSubmitting,
    error,
}: ExpenseFormProps) {
    // Basic Fields
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [amount, setAmount] = useState(initialData?.amount_cents ? (initialData.amount_cents / 100).toFixed(2) : '');
    const [expenseDate, setExpenseDate] = useState(initialData?.expense_date ?? getTodayDateString());
    const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '');
    const [paidByPersonId, setPaidByPersonId] = useState(initialData?.paid_by_person_id ?? people[0]?.id ?? '');
    const [notes, setNotes] = useState(initialData?.notes ?? '');

    // Split State
    const [splitMethod, setSplitMethod] = useState<SplitMethod>((initialData?.split_method as SplitMethod) ?? 'equal');
    const [participantIds, setParticipantIds] = useState<string[]>(initialData?.participant_ids ?? people.map(p => p.id));
    const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => {
        if (initialData?.custom_splits) {
            // Convert number values to string
            const converted: Record<string, string> = {};
            for (const [key, val] of Object.entries(initialData.custom_splits)) {
                converted[key] = String(val);
            }
            return converted;
        }
        return {};
    });
    const [adjustmentFromPersonId, setAdjustmentFromPersonId] = useState(initialData?.adjustment_from_person_id ?? people[0]?.id ?? '');

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
    const [recurringInterval] = useState('1');
    const [recurringEndDate] = useState('');

    // File (placeholder for future receipt upload)
    const [_receiptFile] = useState<File | null>(null);

    const descriptionInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (mode === 'create' && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
        }
    }, [mode]);

    // Split Logic Helpers
    const parseAmountToCents = (value: string) => {
        const amountValue = Number(value);
        if (Number.isNaN(amountValue)) return null;
        return Math.round(amountValue * 100);
    };

    const formatCents = (cents: number) => (cents / 100).toFixed(2);

    const seedCustomValues = (method: SplitMethod, nextParticipants: string[], amt: string) => {
        if (method === 'exact') {
            const cents = parseAmountToCents(amt);
            if (cents === null) return {};
            return calculateEqualSplits(cents, nextParticipants).reduce<Record<string, string>>((acc, split) => {
                acc[split.personId] = formatCents(split.amountCents);
                return acc;
            }, {});
        }
        if (method === 'percentage') {
            return calculateEqualPercentages(nextParticipants).reduce<Record<string, string>>((acc, split) => {
                acc[split.personId] = split.percentage.toFixed(2);
                return acc;
            }, {});
        }
        if (method === 'shares') {
            return nextParticipants.reduce<Record<string, string>>((acc, pid) => {
                acc[pid] = '1';
                return acc;
            }, {});
        }
        return {};
    };

    // Sync custom splits when changing method or participants
    useEffect(() => {
        if (splitMethod === 'equal' || splitMethod === 'adjustment') return;

        // If switching to this method and no values set, seed them
        const hasValues = participantIds.every(pid => customSplits[pid] !== undefined);
        if (!hasValues) {
            const seeded = seedCustomValues(splitMethod, participantIds, amount);
            setCustomSplits(prev => ({ ...prev, ...seeded }));
        }
    }, [splitMethod, participantIds, amount]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation handled by HTML5 mostly, but can add more here

        const payload: ExpenseFormData = {
            mode: isRecurring ? 'recurring' : 'single',
            description,
            amount,
            expenseDate,
            categoryId: categoryId || null,
            paidByPersonId,
            notes,
            splitMethod,
            participantIds,
            customSplits,
            adjustmentFromPersonId,
            receiptFile: _receiptFile,
            frequency: recurringFrequency,
            interval: recurringInterval,
            endDate: recurringEndDate,
        };
        onSubmit(payload);
    };

    // Toggle participant
    const toggleParticipant = (personId: string) => {
        if (splitMethod === 'adjustment') return; // N/A for adjustment
        if (personId === paidByPersonId) return; // Cannot remove payer usually, but let's allow flexibility if logic permits. 
        // Actually, payer acts as "paid behalf of", but they might not be involved in the split (e.g. they paid for others).
        // So we allow unchecking payer.

        setParticipantIds(prev =>
            prev.includes(personId)
                ? prev.filter(id => id !== personId)
                : [...prev, personId]
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                    {mode === 'create' ? 'Add Expense' : 'Edit Expense'}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Input
                    ref={descriptionInputRef}
                    label="Description"
                    placeholder="e.g. Groceries"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 ml-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                            {getCurrencyFormatter(currency).format(0).replace(/\d/g, '').replace(/\./g, '')}
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Select
                    label="Category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                </Select>

                <Select
                    label="Paid By"
                    value={paidByPersonId}
                    onChange={(e) => setPaidByPersonId(e.target.value)}
                >
                    {people.map(p => (
                        <option key={p.id} value={p.id}>{p.display_name}</option>
                    ))}
                </Select>

                <Input
                    type="date"
                    label="Date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                />
            </div>

            {/* Split Section */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-700">Split Method</label>
                        <ExpenseSplittingHelp />
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {(['equal', 'exact', 'percentage', 'shares', 'adjustment'] as SplitMethod[]).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setSplitMethod(m)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                                    splitMethod === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 trigger-hover"
                                )}
                            >
                                {m === 'adjustment' ? 'Reimburse' : m}
                            </button>
                        ))}
                    </div>
                </div>

                {splitMethod === 'adjustment' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Who owes?"
                            value={adjustmentFromPersonId}
                            onChange={(e) => setAdjustmentFromPersonId(e.target.value)}
                        >
                            {people.filter(p => p.id !== paidByPersonId).map(p => (
                                <option key={p.id} value={p.id}>{p.display_name}</option>
                            ))}
                        </Select>
                        <div className="flex items-end pb-2 text-sm text-slate-500">
                            owes {people.find(p => p.id === paidByPersonId)?.display_name}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                            {people.map(person => (
                                <button
                                    key={person.id}
                                    type="button"
                                    onClick={() => toggleParticipant(person.id)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all",
                                        participantIds.includes(person.id)
                                            ? "border-slate-900 bg-slate-50 text-slate-900"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", participantIds.includes(person.id) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300")}>
                                        {participantIds.includes(person.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                    <span className="truncate">{person.display_name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom inputs if not equal */}
                        {splitMethod !== 'equal' && (
                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                {participantIds.map(pid => (
                                    <div key={pid} className="flex items-center gap-2">
                                        <span className="text-xs font-medium w-16 truncate">{people.find(p => p.id === pid)?.display_name}</span>
                                        <Input
                                            placeholder={
                                                splitMethod === 'percentage' ? '%' :
                                                    splitMethod === 'shares' ? 'Shares' :
                                                        'Amount'
                                            }
                                            value={customSplits[pid] || ''}
                                            onChange={(e) => setCustomSplits(prev => ({ ...prev, [pid]: e.target.value }))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Recurring Toggle */}
            {mode === 'create' && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        Recurring Expense
                        <RecurringHelp />
                    </label>
                    {isRecurring && (
                        <div className="flex gap-2">
                            <Select
                                value={recurringFrequency}
                                onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                                className="h-8 text-xs py-1"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                            </Select>
                        </div>
                    )}
                </div>
            )}

            <Input
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
            />

            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

            <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
                    {mode === 'create' ? (isRecurring ? 'Create Recurring' : 'Add Expense') : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
