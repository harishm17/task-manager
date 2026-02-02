import { Button, Input, Select } from '../common/DesignSystem';
import type { Task } from '../../lib/api/tasks';

type TaskFiltersProps = {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    statusFilter: 'all' | Task['status'];
    setStatusFilter: (val: 'all' | Task['status']) => void;
    priorityFilter: 'all' | Task['priority'];
    setPriorityFilter: (val: 'all' | Task['priority']) => void;
    assigneeFilter: string;
    setAssigneeFilter: (val: string) => void;
    people: Array<{ id: string; display_name: string }>;
    onClear: () => void;
    hasFilters: boolean;
};

export function TaskFilters({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    people,
    onClear,
    hasFilters,
}: TaskFiltersProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
            />
            <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9"
            >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
            </Select>
            <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9"
            >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </Select>
            <Select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-9"
            >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {people.map((person) => (
                    <option key={person.id} value={person.id}>
                        {person.display_name}
                    </option>
                ))}
            </Select>
            <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={!hasFilters}
                className="h-9 w-full sm:w-auto"
            >
                Clear
            </Button>
        </div>
    );
}
