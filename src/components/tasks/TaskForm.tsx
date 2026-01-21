import { useState, useEffect, useRef } from 'react';
import { Button, Input, Select, cn } from '../common/DesignSystem';
import type { Task } from '../../lib/api/tasks';
import type { RecurringFrequency } from '../../lib/recurring';
import { getTodayDateString } from '../../lib/recurring';

type TaskFormProps = {
    initialData?: Partial<Task>;
    people: Array<{ id: string; display_name: string }>;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    error?: string | null;
    mode?: 'create' | 'edit';
};

export function TaskForm({
    initialData,
    people,
    onSubmit,
    onCancel,
    isSubmitting,
    error,
    mode = 'create',
}: TaskFormProps) {
    const [title, setTitle] = useState(initialData?.title ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [priority, setPriority] = useState<Task['priority']>(initialData?.priority ?? 'medium');
    const [dueDate, setDueDate] = useState(initialData?.due_date ?? '');
    const [assignedToPersonId, setAssignedToPersonId] = useState(initialData?.assigned_to_person_id ?? '');

    // Recurring state (only for create mode usually, but adaptable)
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('weekly');
    const [recurringInterval, setRecurringInterval] = useState('1');
    const [recurringEndDate, setRecurringEndDate] = useState('');

    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (mode === 'create' && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [mode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        if (mode === 'create' && isRecurring) {
            onSubmit({
                mode: 'recurring',
                title,
                description,
                priority,
                assignedToPersonId,
                frequency: recurringFrequency,
                interval: recurringInterval,
                startDate: dueDate, // In UI we call it due date, but for recurring it's start date
                endDate: recurringEndDate,
            });
        } else {
            onSubmit({
                mode: 'single', // or implied by edit
                title,
                description,
                priority,
                dueDate,
                assignedToPersonId,
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                    {mode === 'create' ? 'New Task' : 'Edit Task'}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Input
                    ref={titleInputRef}
                    label="Task Title"
                    placeholder="What needs to be done?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <Select
                    label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    type="date"
                    label={isRecurring ? 'Start Date' : 'Due Date'}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required={isRecurring}
                />
                <Select
                    label="Assign To"
                    value={assignedToPersonId}
                    onChange={(e) => setAssignedToPersonId(e.target.value)}
                >
                    <option value="">Unassigned</option>
                    {people.map((person) => (
                        <option key={person.id} value={person.id}>
                            {person.display_name}
                        </option>
                    ))}
                </Select>
            </div>

            {mode === 'create' && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => {
                                setIsRecurring(e.target.checked);
                                if (e.target.checked && !dueDate) {
                                    setDueDate(getTodayDateString());
                                }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        Recurring Schedule
                    </label>

                    {isRecurring && (
                        <div className="grid gap-3 pt-2 sm:grid-cols-3">
                            <Select
                                label="Frequency"
                                value={recurringFrequency}
                                onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </Select>
                            <Input
                                type="number"
                                label="Every (interval)"
                                min="1"
                                value={recurringInterval}
                                onChange={(e) => setRecurringInterval(e.target.value)}
                            />
                            <Input
                                type="date"
                                label="End Date (Optional)"
                                value={recurringEndDate}
                                onChange={(e) => setRecurringEndDate(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="text-xs font-semibold text-slate-700 ml-1 mb-1.5 block">Description</label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    placeholder="Add details about this task..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

            <div className="flex gap-3 pt-2">
                <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
                    {mode === 'create' ? (isRecurring ? 'Create Schedule' : 'Create Task') : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
