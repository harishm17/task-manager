import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../lib/api/tasks';
import { Avatar, Badge, Button, cn } from '../common/DesignSystem';

type TaskItemProps = {
    task: Task;
    assigneeName: string;
    onToggleStatus: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    isUpdating?: boolean;
};

const priorityVariants: Record<Task['priority'], 'emerald' | 'amber' | 'rose'> = {
    low: 'emerald',
    medium: 'amber',
    high: 'rose',
};

export function TaskItem({
    task,
    assigneeName,
    onToggleStatus,
    onEdit,
    onDelete,
    isUpdating,
}: TaskItemProps) {
    const isCompleted = task.status === 'completed';

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                'group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-sm sm:flex-row sm:items-start sm:gap-4',
                isCompleted && 'bg-slate-50/50'
            )}
        >
            <div className="flex flex-1 items-start gap-3">
                {/* Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggleStatus(task)}
                    disabled={isUpdating}
                    className={cn(
                        'relative mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200',
                        isCompleted
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 hover:border-emerald-400'
                    )}
                >
                    {isCompleted && (
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" transform="translate(-4, -4) scale(0.8)" />
                            <path d="M3.5 7L5.5 9L10.5 4" />
                        </svg>
                    )}
                </button>

                {/* Content */}
                <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <span
                            className={cn(
                                'text-base font-medium text-slate-900 transition-all',
                                isCompleted && 'text-slate-500 line-through'
                            )}
                        >
                            {task.title}
                        </span>
                    </div>

                    {task.description && (
                        <p className={cn('text-sm text-slate-500', isCompleted && 'text-slate-400')}>
                            {task.description}
                        </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {/* Assignee */}
                        <div className="flex items-center gap-1.5" title="Assignee">
                            <Avatar name={assigneeName} size="sm" className="h-5 w-5 text-[9px]" />
                            <span className="font-medium">{assigneeName}</span>
                        </div>

                        <span className="h-1 w-1 rounded-full bg-slate-200" />

                        {/* Date */}
                        {task.due_date && (
                            <div className="flex items-center gap-1.5" title="Due Date">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>{task.due_date}</span>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            <Badge variant={priorityVariants[task.priority]}>{task.priority}</Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions (visible on hover or focus) */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex-col sm:opacity-0 sm:group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(task)}
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                    title="Edit task"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (window.confirm('Delete this task?')) {
                            onDelete(task.id);
                        }
                    }}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600"
                    title="Delete task"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </Button>
            </div>
        </motion.li>
    );
}
